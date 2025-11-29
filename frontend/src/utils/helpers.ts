import {PasswordStrengthResult} from "../types";

/**
 * Validate email format
 */
export const validateEmail = (email:string):boolean => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

/**
 * Calculate password strength
 */
export const calculatePasswordStrength = (password:string):PasswordStrengthResult => {
	let score = 0;
	if(password.length >= 6) score++;
	if(password.length >= 8) score++;
	if(/[A-Z]/.test(password)) score++;
	if(/[0-9]/.test(password)) score++;
	if(/[^A-Za-z0-9]/.test(password)) score++;
	
	let text = "";
	if(score < 2) text = "Weak";
	else if(score === 2) text = "Fair";
	else if(score === 3) text = "Good";
	else text = "Strong";
	
	return {score, text};
};

/**
 * Local storage utilities with error handling
 */
export const storage = {
	get : <T>(key:string):T | null => {
		try{
			const item = localStorage.getItem(key);
			return item ? JSON.parse(item) : null;
		}catch(error){
			console.error(`Error reading from localStorage: ${error}`);
			return null;
		}
	},
	
	set : <T>(key:string, value:T):boolean => {
		try{
			localStorage.setItem(key, JSON.stringify(value));
			return true;
		}catch(error){
			console.error(`Error writing to localStorage: ${error}`);
			return false;
		}
	},
	
	remove : (key:string):boolean => {
		try{
			localStorage.removeItem(key);
			return true;
		}catch(error){
			console.error(`Error removing from localStorage: ${error}`);
			return false;
		}
	}
};
