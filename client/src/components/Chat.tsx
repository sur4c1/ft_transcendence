import { useContext, useEffect, useState } from "react";
import socket from "../socket";
import axios from "axios";
import { UserContext } from "../App";
import { Link } from "react-router-dom";
import { use } from "matter-js";
// import style from "../style/Chat.module.scss";

const Chat = () => {
	const [chat, setChat] = useState(false);

	const toggleChat = () => {
		setChat(!chat);
	};

	return (
		<div>
			{chat ? (
				<ChatBox toggleChat={toggleChat} />
			) : (
				<button onClick={toggleChat}>Toggle Chat</button>
			)}
		</div>
	);
};

const ChatBox = ({ toggleChat }: { toggleChat: Function }) => {
	const [channel, setChannel] = useState<String | null>(null);
	const [showList, setShowList] = useState(false);

	const toggleShowlist = () => {
		setShowList(!showList);
	};

	return (
		<div>
			<button onClick={() => toggleChat()}>Close Chat</button>
			{!channel ? (
				<ChannelList setChannel={setChannel} />
			) : !showList ? (
				<ChatWindow
					channel={channel}
					toggleShowlist={toggleShowlist}
					setChannel={setChannel}
				/>
			) : (
				<UserList
					channel={channel}
					toggleShowlist={toggleShowlist}
				/>
			)}
		</div>
	);
};

const ChannelCreation = () => {
	const createChannel = async () => {
		await axios
			.post(`${process.env.REACT_APP_BACKEND_URL}/channel`, {
				ownerLogin: "Link",
				name: (document.getElementById("name") as HTMLInputElement)
					.value,
				password: (document.getElementById("pass") as HTMLInputElement)
					.value,
			})
			.then(async (response) => {
				await axios
					.post(`${process.env.REACT_APP_BACKEND_URL}/membership`, {
						channelName: response.data.name,
						userLogin: "Link",
						isAdmin: true,
					})
					.catch((err) => {
						console.log("bouh");
						console.log(err);
					});
			})
			.catch((err) => {
				console.log(err);
			});
	};

	return (
		<>
			<form>
				<label>Nom du channel</label>
				<input
					id='name'
					type='text'
					defaultValue={""}
				/>
				<label>Mot de passe (optionnel)</label>
				<input
					id='pass'
					type='password'
				/>
			</form>
			<button onClick={createChannel}>Creer</button>
		</>
	);
};

const NewChannel = () => {
	const [channels, setChannels] = useState<any[]>([]);
	const [channelCreation, setChannelCreation] = useState(false);

	useEffect(() => {
		axios
			.get(`${process.env.REACT_APP_BACKEND_URL}/channel/public`)
			.then((response) => {
				setChannels(
					response.data.sort(
						(a: any, b: any) => a.createdAt - b.createdAt
					)
				);
			})
			.catch((err) => {
				console.log(err);
			});
	}, []);

	const createChannel = () => {
		setChannelCreation(!channelCreation);
	};

	return (
		<>
			{channelCreation ? (
				<>
					<button onClick={createChannel}>Annuler</button>
					<ChannelCreation />
				</>
			) : (
				<>
					<button onClick={createChannel}>Creer un channel</button>
					{channels.map((channel, i) => (
						<div key={i}>
							<label>{channel.name}</label>{" "}
							{channel.password ? <label>🔒</label> : <></>}
						</div>
					))}
				</>
			)}
		</>
	);
};

const ChannelList = ({ setChannel }: { setChannel: Function }) => {
	const [channels, setChannels] = useState<String[]>([]);
	const [newChannelVisibility, setNewChannelVisibility] = useState(false);
	const context = useContext(UserContext);

	useEffect(() => {
		axios
			.get(
				`${process.env.REACT_APP_BACKEND_URL}/membership/user/${context.login}`
			)
			.then((response) => {
				console.log(response.data);
				setChannels(
					response.data.map(
						(membership: any) => membership.channelName
					)
				);
			})
			.catch((err) => {
				console.log(err);
			});
	}, []);

	const addChannel = () => {
		setNewChannelVisibility(!newChannelVisibility);
	};

	return (
		<div>
			<h1>Channel List</h1>
			<button onClick={addChannel}>
				{newChannelVisibility ? <>x</> : <>+</>}
			</button>
			{newChannelVisibility ? (
				<NewChannel />
			) : (
				<>
					{channels.length ? (
						channels.map((channel, i) => (
							<button
								key={i}
								onClick={() => setChannel(channel)}
							>
								{channel}
							</button>
						))
					) : (
						<div>Tu n'as encore rejoins aucun channel bébé sel</div>
					)}
				</>
			)}
		</div>
	);
};

const UserList = ({
	channel,
	toggleShowlist,
}: {
	channel: String;
	toggleShowlist: Function;
}) => {
	const [users, setUsers] = useState<String[]>([]);

	useEffect(() => {
		axios
			.get(
				`${process.env.REACT_APP_BACKEND_URL}/membership/channel/${channel}`
			)
			.then((res) => {
				setUsers(
					res.data.map((membership: any) => membership.userLogin)
				);
			})
			.catch((err) => {
				console.log(err);
			});
	}, []);

	return (
		<div>
			<button onClick={() => toggleShowlist()}>Back</button>
			<h1>User List</h1>
			{users.length ? (
				users.map((user, i) => (
					<div key={i}>
						<Link to={`/profile/${user}`}>{user}</Link>
					</div>
				))
			) : (
				<div>
					Tu n'as pas encore de conversations privées bebou sucre
				</div>
			)}
		</div>
	);
};

const ChatWindow = ({
	channel,
	toggleShowlist,
	setChannel,
}: {
	channel: String;
	toggleShowlist: Function;
	setChannel: Function;
}) => {
	const [messages, setMessages] = useState<any[]>([]);
	const [update, setUpdate] = useState(true);

	useEffect(() => {
		function clic(payload: String) {
			if (payload === channel) setUpdate(true);
		}

		socket.on("newMessage", clic);
		return () => {
			socket.off("newMessage", clic);
		};
	}, []);

	useEffect(() => {
		if (!update) return;

		axios
			.get(
				`${process.env.REACT_APP_BACKEND_URL}/message/channel/${channel}`
			)
			.then((res) => {
				console.log(res.data);
				setMessages(res.data);
			})
			.catch((err) => {
				console.log(err);
			});
		setUpdate(false);
	}, [update]);

	return (
		<div>
			<button onClick={() => setChannel(null)}>Back</button>
			<button
				onClick={() => {
					toggleShowlist();
				}}
			>
				User List
			</button>
			<h1>{channel}</h1>
			{messages.map((message, i) => (
				<div key={i}>
					<h2>{message.userLogin}</h2>
					<label>{message.createdAt}</label>
					<p>{message.content}</p>
				</div>
			))}
			<button
				onClick={async () => {
					await axios.post(
						`${process.env.REACT_APP_BACKEND_URL}/message`,
						{
							chanName: "oui",
							content: "test message",
							userLogin: "iCARUS",
						}
					);
				}}
			>
				send message
			</button>
		</div>
	);
};

export default Chat;
