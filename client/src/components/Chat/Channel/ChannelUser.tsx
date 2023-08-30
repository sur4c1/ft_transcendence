import axios from "axios";
import { useContext, useState } from "react";
import { Link, redirect } from "react-router-dom";
import socket from "../../../socket";
import { PPDisplayer } from "../../ImageDisplayer";
import { UserContext } from "../../../App";
import MuteBanForm from "./MuteBanForm";
import { AskForGameButton, DemoteButton, PromoteButton } from "../../ActionsButtons";

const ChannelUser = ({
	admins,
	login,
	members,
	toggleFriendship,
	toggleBlock,
	owner,
	channel,
}: {
	admins: string[];
	login: string;
	members: any;
	owner: string;
	channel: string;
	toggleFriendship: Function;
	toggleBlock: Function;
}) => {
	const user = useContext(UserContext);
	const [isToggleBox, setIsToggleBox] = useState(false);
	const [userStatus, setUserStatus] = useState<any>({
		isMuted: false,
	});
	const [toggleAdminBox, setToggleAdminBox] = useState({
		isActive: false,
		type: "" as "" | "mute" | "ban",
	});

	const toggleBox = async (login = user.login) => {
		if (login === user.login) return redirect(`/profile/${user.login}`); //TODO: replace the redirect by something else that works
		if (
			!isToggleBox &&
			(admins.includes(user.login) || user.login === owner)
		) {
			await axios
				.get(
					`${process.env.REACT_APP_PROTOCOL}://${process.env.REACT_APP_HOSTNAME}:${process.env.REACT_APP_BACKEND_PORT}/api/mute/user/${login}/channel/${channel}`
				)
				.then((res) => {
					setUserStatus({
						isMuted: res.data.length !== 0,
					});
				})
				.then(() => {
					setIsToggleBox(!isToggleBox);
				})
				.catch((err) => {
					console.log(err);
				});
		} else setIsToggleBox(!isToggleBox);
	};

	const kick = async (login: string) => {
		await axios
			.get(
				`${process.env.REACT_APP_PROTOCOL}://${process.env.REACT_APP_HOSTNAME}:${process.env.REACT_APP_BACKEND_PORT}/api/membership/user/${login}/channel/${channel}`
			)
			.then((res) => {
				if (res.data.length !== 0) {
					axios
						.delete(
							`${process.env.REACT_APP_PROTOCOL}://${process.env.REACT_APP_HOSTNAME}:${process.env.REACT_APP_BACKEND_PORT}/api/membership/user/${login}/channel/${channel}`
						)
						.then(() => {
							socket.emit("newMessageDaddy", {
								//TODO: change it to a kick message so that the user knows he got kicked
								channel: channel,
							});
						})
						.catch((err) => {
							console.log(err);
						});
				}
			})
			.catch((err) => {
				console.log(err);
			});
	};

	const mute = async (login: string) => {
		if (userStatus.isMuted) {
			await unmuteSomeone(login);
		} else {
			setToggleAdminBox({
				isActive: true,
				type: "mute",
			});
		}
	};

	const unmuteSomeone = async (login: string) => {
		axios
			.get(
				`${process.env.REACT_APP_PROTOCOL}://${process.env.REACT_APP_HOSTNAME}:${process.env.REACT_APP_BACKEND_PORT}/api/mute/user/${login}/channel/${channel}`
			)
			.then((res) => {
				if (res.data.length !== 0) {
					console.log(res.data);
					const muteToUnmute = res.data.sort((a: any, b: any) => {
						return a.id - b.id;
					})[0];
					axios
						.delete(
							`${process.env.REACT_APP_PROTOCOL}://${process.env.REACT_APP_HOSTNAME}:${process.env.REACT_APP_BACKEND_PORT}/api/mute/user/${muteToUnmute.user.login}/channel/${muteToUnmute.channel.name}`
						)
						.then(() => {
							setIsToggleBox(false);
							setToggleAdminBox({
								isActive: false,
								type: "",
							});
							setUserStatus({
								isMuted: false,
							});
							socket.emit("newMessageDaddy", {
								channel: channel,
							});
						})
						.catch((err) => {
							console.log(err);
						});
				}
			})
			.catch((err) => {
				console.log(err);
			});
	};

	return (
		<>
			{toggleAdminBox.isActive && (
				<MuteBanForm
					channel={channel}
					login={login}
					boxType={toggleAdminBox.type}
					setToggleAdminBox={setToggleAdminBox}
					setIsToggleBox={setIsToggleBox}
					setUserStatus={setUserStatus}
					kick={kick}
				/>
			)}
			<div>
				{isToggleBox && (
					<div>
						<div>
							<Link to={`/profile/${login}`}>
								<label>Profil</label>
							</Link>
							{!members[login].isBlocked && (
								<AskForGameButton login={login}/>
							)}
							{!members[login].isBlocked && (
								<button
									onClick={() => {
										toggleFriendship(login);
										toggleBox();
									}}
								>
									{members[login].isFriend
										? "Message privé"
										: "Demander en ami"}
								</button>
							)}
							<button
								onClick={() => {
									toggleBlock(login);
									toggleBox();
								}}
							>
								{members[login].isBlocked
									? "Débloquer"
									: "Bloquer"}
							</button>
							{user.login === owner &&
								(admins.includes(login) ? (
									<DemoteButton login={login} channel={channel}/>
								) : (
									<PromoteButton login={login} channel={channel}/>
								))}
							{(user.login === owner ||
								(admins.includes(user.login) &&
									login !== owner &&
									!admins.includes(login))) && (
								<>
									<button
										onClick={() => {
											kick(login);
										}}
									>
										Kick
									</button>
									<button
										onClick={() => {
											mute(login);
										}}
									>
										{userStatus.isMuted ? "Unmute" : "Mute"}
									</button>
									<button
										onClick={() => {
											setToggleAdminBox({
												isActive: true,
												type: "ban",
											});
										}}
									>
										Ban
									</button>
								</>
							)}
						</div>
					</div>
				)}
				<button
					onClick={() => {
						{
							login !== user.login && toggleBox(login);
						}
					}}
				>
					{user.login !== login ? (
						<label>
							{login} {members[login].isBlocked ? "(bloqué)" : ""}
						</label>
					) : (
						<label>{login} (you) </label>
					)}
					<PPDisplayer login={login} size={50} status={true}>
						<img
							src={`data:image/*;base64,${members[login].user.avatar}`}
						/>
					</PPDisplayer>
					{login === owner
						? " (owner)"
						: admins.includes(login) && " (admin)"}
				</button>
			</div>
		</>
	);
};

export default ChannelUser;
