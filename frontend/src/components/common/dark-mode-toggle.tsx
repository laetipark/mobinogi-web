import React, {useEffect, useState} from "react";
import {Moon, Sun} from "lucide-react";
import styles from "./dark-mode-toggle.module.scss";

const DarkModeToggle:React.FC = () => {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		// 초기 다크모드 상태 확인
		const savedMode = localStorage.getItem("darkMode");
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const initialDark = savedMode === "true" || (!savedMode && prefersDark);

		setIsDark(initialDark);
		document.documentElement.classList.toggle("dark-mode", initialDark);
	}, []);

	const toggleDarkMode = () => {
		const newDarkMode = !isDark;
		setIsDark(newDarkMode);
		document.documentElement.classList.toggle("dark-mode", newDarkMode);
		localStorage.setItem("darkMode", String(newDarkMode));
	};

	return (
		<button
			className={styles.darkModeToggle}
			onClick={toggleDarkMode}
			aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
			title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
		>
			{isDark ? <Sun size={24}/> : <Moon size={24}/>}
		</button>
	);
};

export default DarkModeToggle;
