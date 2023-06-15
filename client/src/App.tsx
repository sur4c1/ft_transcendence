import axios from "axios";
import "./style/App.css";
import Routage from "./components/Routage";
import { createContext, useEffect, useState } from "react";
import Chat from "./components/Chat";

export const ClearanceContext = createContext(0);

const App = () => {
	const [clearance, setClearance] = useState(0);

	/**
	 * Get the user's clearance level and store it in the context so it can be used in the whole app
	 */
	useEffect(() => {
		axios
			.get(`${process.env.REACT_APP_BACKEND_URL}/auth/clearance`, {})
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
				setClearance(0);
			});
	}, []);

	return (
		<ClearanceContext.Provider value={clearance}>
			{/* {(() => {
				console.log("YAY YAY BAGUETTE", clearance);
				return <></>;
			})()} */}
			<Routage />
			<Chat />
		</ClearanceContext.Provider>
	);
};

export default App;
