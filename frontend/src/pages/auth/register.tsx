import React, {useState, FormEvent, ChangeEvent} from "react";
import {useNavigate, Link} from "react-router-dom";
import {Eye, EyeOff, AlertCircle, CheckCircle} from "lucide-react";
import {useAuth} from "@/hooks/use-auth";
import {RegisterFormData} from "@/types";
import {calculatePasswordStrength, validateEmail} from "@/utils/helpers";

const RegisterPage:React.FC = () => {
	const {register} = useAuth();
	const navigate = useNavigate();
	const [formData, setFormData] = useState<RegisterFormData>({
		username : "",
		email : "",
		password : "",
		confirmPassword : ""
	});
	const [showPassword, setShowPassword] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string>("");
	
	/**
	 * Utility function async.
	 */
	const handleSubmit = async(e:FormEvent<HTMLFormElement>):Promise<void> => {
		e.preventDefault();
		setIsLoading(true);
		setError("");
		
		if(formData.password !== formData.confirmPassword){
			setError("Passwords do not match");
			setIsLoading(false);
			return;
		}
		
		if(!validateEmail(formData.email)){
			setError("Please enter a valid email address");
			setIsLoading(false);
			return;
		}
		
		try{
			await register(formData.username, formData.email, formData.password);
			navigate("/controllers");
		}catch(err){
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
			setError(errorMessage);
		}finally{
			setIsLoading(false);
		}
	};
	
	/**
	 * Utility function handleChange.
	 */
	const handleChange = (e:ChangeEvent<HTMLInputElement>):void => {
		const {name, value} = e.target;
		setFormData(prev => ({
			...prev,
			[name] : value
		}));
		if(error) setError("");
	};
	
	const passwordStrength = calculatePasswordStrength(formData.password);
	const isPasswordMatch = formData.password && formData.confirmPassword &&
		formData.password === formData.confirmPassword;
	const isEmailValid = formData.email ? validateEmail(formData.email) : true;
	
	const isFormValid =
		formData.username.trim().length >= 3 &&
		formData.email.trim() &&
		isEmailValid &&
		formData.password.length >= 6 &&
		formData.confirmPassword &&
		isPasswordMatch;
	
	return (
		<div className="auth-page">
			<div className="auth-container">
				<div className="auth-form">
					<div className="auth-header">
						<h1>Create Account</h1>
						<p>Join the controller management platform</p>
					</div>
					
					<form onSubmit={handleSubmit} className="form">
						<div className="form-group">
							<label htmlFor="username">Username</label>
							<input
								id="username"
								name="username"
								type="text"
								value={formData.username}
								onChange={handleChange}
								placeholder="Choose a username"
								required
								autoComplete="username"
								disabled={isLoading}
								minLength={3}
							/>
						</div>
						
						<div className="form-group">
							<label htmlFor="email">Email</label>
							<input
								id="email"
								name="email"
								type="email"
								value={formData.email}
								onChange={handleChange}
								placeholder="Enter your email"
								required
								autoComplete="email"
								disabled={isLoading}
							/>
						</div>
						
						<div className="form-group">
							<label htmlFor="password">Password</label>
							<div className="password-input">
								<input
									id="password"
									name="password"
									type={showPassword ? "text" : "password"}
									value={formData.password}
									onChange={handleChange}
									placeholder="Create a password"
									required
									autoComplete="new-password"
									disabled={isLoading}
									minLength={6}
								/>
								<button
									type="button"
									className="password-toggle"
									onClick={() => setShowPassword(!showPassword)}
									disabled={isLoading}
								>
									{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
								</button>
							</div>
							{formData.password && (
								<div className="password-strength">
									<div className={`strength-bar strength-${passwordStrength.score}`}>
										<div className="strength-fill"></div>
									</div>
									<span className="strength-text">
                    {passwordStrength.text}
                  </span>
								</div>
							)}
						</div>
						
						<div className="form-group">
							<label htmlFor="confirmPassword">Confirm Password</label>
							<div className="password-input">
								<input
									id="confirmPassword"
									name="confirmPassword"
									type="password"
									value={formData.confirmPassword}
									onChange={handleChange}
									placeholder="Confirm your password"
									required
									disabled={isLoading}
								/>
								{formData.confirmPassword && (
									<div className="password-match-icon">
										{isPasswordMatch ? (
											<CheckCircle size={20} className="text-success"/>
										) : (
											<AlertCircle size={20} className="text-error"/>
										)}
									</div>
								)}
							</div>
						</div>
						
						{error && (
							<div className="error-message" role="alert">
								<AlertCircle size={16}/>
								<span>{error}</span>
							</div>
						)}
						
						<button
							type="submit"
							className="btn primary large"
							disabled={isLoading || !isFormValid}
						>
							{isLoading ? "Creating Account..." : "Create Account"}
						</button>
					</form>
					
					<div className="auth-footer">
						<p>
							Already have an account?{" "}
							<Link to="/login" className="link-btn">
								Sign in
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default RegisterPage;
