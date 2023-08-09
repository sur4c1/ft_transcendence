import axios from "axios";
import Routage from "./components/Routage";
import { ChangeEvent, createContext, useEffect, useState } from "react";
import style from "./style/App.module.scss";
import socket from "./socket";
import { use } from "matter-js";
import Cookies from "js-cookie";

export const UserContext = createContext({
	login: "",
	clearance: 0,
	theme: "light",
	toggleTheme: () => {},
});

const App = () => {
	const [clearance, setClearance] = useState({
		login: "",
		clearance: 0,
		theme: "light",
	});

	useEffect(() => {
		socket.on("ping", (data) => {
			socket.emit("pong", {
				...data,
				auth: Cookies.get("token"),
				status: "online",
			}); //TODO: status ingame if needed
		});

		return () => {
			socket.off("ping");
		};
	}, []);

	const toggleTheme = () => {
		setClearance((clearance) => {
			return {
				...clearance,
				theme: clearance.theme === "light" ? "dark" : "light",
			};
		});
	};

	/**
	 * Get the user's clearance level and store it in the context so it can be used in the whole app
	 */
	useEffect(() => {
		axios
			.get(
				`${process.env.REACT_APP_PROTOCOL}://${process.env.REACT_APP_HOSTNAME}:${process.env.REACT_APP_BACKEND_PORT}/api/auth/clearance`,
				{}
			)
			.then((response) => {
				if (!response) {
					throw new Error(
						`This is an HTTP error: The status is : pas bien`
					);
				}
				return response;
			})
			.then((response) => {
				setClearance(response.data);
			})
			.catch((err) => {
				setClearance({ ...clearance, login: "", clearance: 0 });
			});
	}, []);

	return (
		<div className={clearance.theme == "light" ? style.light : style.dark}>
			<UserContext.Provider
				value={{ ...clearance, toggleTheme: toggleTheme }}
			>
				<Routage />
			</UserContext.Provider>
		</div>
	);
};

export default App;
