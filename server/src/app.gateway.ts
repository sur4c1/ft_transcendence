import {
	SubscribeMessage,
	WebSocketGateway,
	OnGatewayInit,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { GameService } from './game/game.service';
import { UserService } from './user/user.service';
import { UserGameService } from './user-game/user-game.service';
import { Game } from './game/game.entity';

@WebSocketGateway({
	cors: {
		origin: '*',
	},
})
export class AppGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	constructor(
		private userService: UserService,
		private gameService: GameService,
		private usergameService: UserGameService,
	) {}

	@WebSocketServer() server: Server;
	private logger: Logger = new Logger('AppGateway');

	afterInit(server: Server) {
		this.logger.log('Init');
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Client disconnected: ${client.id}`);
	}

	handleConnection(client: Socket, ...args: any[]) {
		this.logger.log(`Client connected: ${client.id}`);
	}

	/*********************************************************
	 * 														 *
	 * 					MESSAGES HANDLING 					 *
	 * 					            						 *
	 ********************************************************/
	@SubscribeMessage('newMessageDaddy')
	async notifyUpdate(client: Socket, payload: any) {
		this.server.emit('youGotMail', payload.channel);
	}

	/*********************************************************
	 * 														 *
	 * 					GAME HANDLING						 *
	 * 					            						 *
	 ********************************************************/

	//TODO: handle properly quittage de game en cours -> plein de trucs a devoir gerer

	private game = {
		players: [
			{
				paddle: {
					size: {
						w: 0,
						h: 0,
					},
					position: {
						x: 0,
						y: 0,
					},
					velocity: {
						dx: 0,
						dy: 0,
					},
				},
				score: 0,
				inputs: [],
				login: '',
			},
			{
				paddle: {
					size: {
						w: 0,
						h: 0,
					},
					position: {
						x: 0,
						y: 0,
					},
					velocity: {
						dx: 0,
						dy: 0,
					},
				},
				score: 0,
				inputs: [],
				login: '',
			},
		],
		ball: {
			size: {
				radius: 0,
			},
			position: {
				x: 0,
				y: 0,
			},
			velocity: {
				dx: 0,
				dy: 0,
			},
		},
		turn: 0,
		playerToStart: 0,
		isTurnStarted: false,
		gameId: 0,
		lastTimestamp: 0,
		height: 600,
		width: 800,
		isOver: false,
	};

	private gameLoop: NodeJS.Timeout | null = null;

	handleInputs() {
		this.game.players.forEach((player) => {
			let inputs = player.inputs;
			player.paddle.velocity.dy = 0;
			if (inputs.includes(38) || inputs.includes(87)) {
				//UP or W
				player.paddle.velocity.dy -= 1;
			}
			if (inputs.includes(40) || inputs.includes(83)) {
				//DOWN or S
				player.paddle.velocity.dy += 1;
			}
		});
	}

	moveBall(dt: number) {
		this.game.ball.position.x += this.game.ball.velocity.dx * dt;
		this.game.ball.position.y += this.game.ball.velocity.dy * dt;
	}

	movePaddles(dt: number) {
		this.game.players.forEach((player) => {
			player.paddle.position.y += player.paddle.velocity.dy * dt;
			if (
				player.paddle.position.y + player.paddle.size.h / 2 >
				this.game.height / 2
			) {
				player.paddle.position.y =
					this.game.height / 2 - player.paddle.size.h / 2;
			}
			if (
				player.paddle.position.y - player.paddle.size.h / 2 <
				-this.game.height / 2
			) {
				player.paddle.position.y =
					-this.game.height / 2 + player.paddle.size.h / 2;
			}
		});
	}

	resetBall() {
		this.game.ball.position.x = 0;
		this.game.ball.position.y =
			(this.game.height / 2 - 50) * (this.game.turn % 2 == 0 ? 1 : -1);
		this.game.ball.velocity.dx = this.game.playerToStart == 0 ? -0.5 : 0.5;
		this.game.ball.velocity.dy = this.game.turn % 2 == 0 ? 1 : -1;
		this.game.ball.size.radius = 10;
	}

	resetPaddles() {
		this.game.players.forEach((player, i) => {
			player.paddle.position.y = 0;
			player.paddle.velocity.dy = 0;
			player.paddle.position.x = i == 0 ? -350 : 350;
			player.paddle.size.w = 8 * 1;
			player.paddle.size.h = 8 * 7;
		});
	}

	bounceOnWalls = () => {
		//get all values in shorter variables
		const ballY = this.game.ball.position.y;
		const signOfY = Math.sign(ballY);
		if (signOfY == 0) return;

		const ballX = this.game.ball.position.x;
		const ballRadius = this.game.ball.size.radius;

		//check if ball is in wall
		const ballIsInWall =
			Math.abs(ballY + ballRadius * signOfY) >
			Math.abs(this.game.height / 2);
		if (!ballIsInWall) return;

		//	calculate new ball position and velocity
		// The ball go in direction of x=0
		const newBallDy = -Math.abs(this.game.ball.velocity.dy) * signOfY;
		// The ball is placed tangent to the wall
		const newBallY = (this.game.height / 2 - ballRadius) * signOfY;
		const newBallX =
			ballX +
			(this.game.ball.velocity.dx / this.game.ball.velocity.dy) *
				(signOfY * (this.game.height / 2 - ballRadius) - ballY);

		//apply new ball position and velocity
		this.game.ball.velocity.dy = newBallDy;
		this.game.ball.position.y = newBallY;
		this.game.ball.position.x = newBallX;
	};

	checkCollisions() {
		this.bounceOnWalls();
		this.game.players.forEach((player, i) => {
			const paddle = player.paddle;
			const distBallPaddleX =
				this.game.ball.position.x -
				Math.max(
					paddle.position.x - paddle.size.w / 2,
					Math.min(
						this.game.ball.position.x,
						paddle.position.x + paddle.size.w / 2,
					),
				);
			const distBallPaddleY =
				this.game.ball.position.y -
				Math.max(
					paddle.position.y - paddle.size.h / 2,
					Math.min(
						this.game.ball.position.y,
						paddle.position.y + paddle.size.h / 2,
					),
				);
			const distanceBallPaddleSquared =
				distBallPaddleX ** 2 + distBallPaddleY ** 2;
			const isBallInPaddle =
				distanceBallPaddleSquared < this.game.ball.size.radius ** 2;
			if (!isBallInPaddle) return;
			this.game.ball.velocity.dx = 1 - 2 * i;
			this.game.ball.position.y +=
				(this.game.ball.velocity.dy *
					(paddle.position.x +
						(paddle.size.w / 2 + this.game.ball.size.radius / 2) *
							Math.sign(this.game.ball.velocity.dx) -
						this.game.ball.position.x)) /
				this.game.ball.velocity.dx;
			this.game.ball.position.x =
				paddle.position.x +
				(paddle.size.w / 2 + this.game.ball.size.radius / 2) *
					Math.sign(this.game.ball.velocity.dx);
			this.game.ball.velocity.dy =
				(this.game.ball.position.y - paddle.position.y) /
				(paddle.size.h / 2);
		});

		const checkForScore = (n: number) => {
			this.game.players[n].score++;
			this.game.playerToStart = 1 - n;
			this.game.isTurnStarted = false;
			this.resetBall();
			// this.resetPaddles();
			if (this.game.players[n].score >= 11) this.game.isOver = true;
		};
		//score on player 0 goal
		if (this.game.ball.position.x < -this.game.width / 2) checkForScore(1);
		// score on player 1 goal
		if (this.game.ball.position.x > this.game.width / 2) checkForScore(0);
	}

	handleStartTurn() {
		if (this.game.isTurnStarted) return;
		let inputs = this.game.players[this.game.playerToStart].inputs;
		if (inputs.includes(32)) {
			//SPACE
			this.game.isTurnStarted = true;
			this.game.turn++;
		}
	}

	startGame(gameId: number, player1: string, player2: string) {
		this.game.gameId = gameId;
		this.game.players[0].login = player1;
		this.game.players[1].login = player2;
		this.resetBall();
		this.resetPaddles();
		this.game.lastTimestamp = Date.now();
		this.gameLoop = setInterval(() => {
			//update dt
			let now = Date.now();
			let dt = now - this.game.lastTimestamp;
			this.game.lastTimestamp = now;

			// check for final score
			if (
				this.game.players[0].score >= 11 ||
				this.game.players[1].score >= 11
			) {
				this.game.isOver = true;
				this.server.to(`game-${gameId}`).emit('gameUpdate', this.game);
				this.stopGame();
				return;
			}

			// if turn is started, update the game
			this.handleInputs();
			this.movePaddles(dt);
			if (this.game.isTurnStarted) {
				this.moveBall(dt);
				this.checkCollisions();
			} else this.handleStartTurn();
			this.server.to(`game-${gameId}`).emit('gameUpdate', this.game);
		}, 16);
	}

	stopGame() {
		clearInterval(this.gameLoop);
		this.game = {
			players: [
				{
					paddle: {
						size: {
							w: 0,
							h: 0,
						},
						position: {
							x: 0,
							y: 0,
						},
						velocity: {
							dx: 0,
							dy: 0,
						},
					},
					score: 0,
					inputs: [],
					login: '',
				},
				{
					paddle: {
						size: {
							w: 0,
							h: 0,
						},
						position: {
							x: 0,
							y: 0,
						},
						velocity: {
							dx: 0,
							dy: 0,
						},
					},
					score: 0,
					inputs: [],
					login: '',
				},
			],
			ball: {
				size: {
					radius: 0,
				},
				position: {
					x: 0,
					y: 0,
				},
				velocity: {
					dx: 0,
					dy: 0,
				},
			},
			turn: 0,
			playerToStart: 0,
			isTurnStarted: false,
			gameId: 0,
			lastTimestamp: 0,
			height: 600,
			width: 800,
			isOver: false,
		};
	}

	@SubscribeMessage('joinWaitRoom')
	async handleJoinWaitRoom(client: Socket, payload: any): Promise<void> {
		//verifiy the user
		if (!payload.auth) return;
		let session = await jwt.verify(payload.auth, process.env.JWT_KEY);
		if (!session) return;
		let user = await this.userService.findByLogin(session.login);

		//get the user back from his game if he has one
		let userGame = await this.usergameService.findNotFinishedByLogin(
			user.dataValues.login,
		);
		if (userGame) {
			client.emit('startGame', {
				gameId: userGame.gameId,
				isNew: false,
			});
			client.join(`game-${userGame.gameId}`);
			return;
		}

		//if there isn't a game waiting for a player, create it
		let waitingGame = await this.gameService.findWaiting(payload.isRanked);
		if (!waitingGame) {
			waitingGame = await this.gameService.create({
				isRanked: payload.isRanked,
				status: 'waiting',
				users: [user],
				modifiers: [
					/*TODO: add modifiers from payload*/
				],
			});
			client.join(`game-${waitingGame.id}`);
		} else {
			//else, join the other player waiting
			client.join(`game-${waitingGame.id}`);
			let users = waitingGame.users;
			users.push(user);
			waitingGame.$set('users', users);
			await waitingGame.save();
			this.server.to(`game-${waitingGame.id}`).emit('startGame', {
				gameId: waitingGame.id,
				isNew: true,
			});
			this.startGame(waitingGame.id, users[0].login, users[1].login);
		}
	}

	@SubscribeMessage('quitWaitRoom')
	async handleQuitWaitRoom(client: Socket, payload: any): Promise<void> {
		// Get the user
		// If waiting solo
		////// Yes: delete the game
		////// Return OK
		// Else
		////// Return nop attends
	}

	@SubscribeMessage('keys')
	async handleKeys(client: Socket, payload: any): Promise<void> {
		let player = this.game.players.find((p) => p.login === payload.login);
		if (!player) return;
		player.inputs = payload.keys;
	}
}
