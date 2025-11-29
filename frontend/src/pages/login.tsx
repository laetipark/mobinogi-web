import React, {useState, FormEvent, ChangeEvent} from "react";
import {useNavigate, Link} from "react-router-dom";
import {Eye, EyeOff, AlertCircle} from "lucide-react";
import {useAuth} from "../hooks/use-auth.ts";
import {LoginFormData} from "../types";
import KakaoLogin from "../components/kakao-login";

const LoginPage:React.FC = () => {
	const {login} = useAuth();
	const navigate = useNavigate();
	const [formData, setFormData] = useState<LoginFormData>({
		username : "",
		password : ""
	});
	const [showPassword, setShowPassword] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string>("");
	
	const handleSubmit = async(e:FormEvent<HTMLFormElement>):Promise<void> => {
		e.preventDefault();
		setIsLoading(true);
		setError("");
		
		try{
			await login(formData.username, formData.password);
			navigate("/controllers");
		}catch(err){
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
			setError(errorMessage);
		}finally{
			setIsLoading(false);
		}
	};
	
	const handleChange = (e:ChangeEvent<HTMLInputElement>):void => {
		const {name, value} = e.target;
		setFormData(prev => ({
			...prev,
			[name] : value
		}));
		if(error) setError("");
	};
	
	const togglePasswordVisibility = ():void => {
		setShowPassword(prev => !prev);
	};
	
	const isFormValid = formData.username.trim() && formData.password.trim();
	
	return (
		<div className="auth-page">
			<div className="auth-container">
				{/* 카카오 로그인 섹션 */}
				<div className="auth-section kakao-section">
					<KakaoLogin showTitle={false}/>
				</div>
				
				{/* 기존 로그인 폼 */}
				<div className="auth-form">
					<div className="auth-header">
						<h1>Welcome Back</h1>
						<p>Sign in to access your controller dashboard</p>
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
								placeholder="Enter your username"
								required
								autoComplete="username"
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
									placeholder="Enter your password"
									required
									autoComplete="current-password"
									disabled={isLoading}
								/>
								<button
									type="button"
									className="password-toggle"
									onClick={togglePasswordVisibility}
									aria-label={showPassword ? "Hide password" : "Show password"}
									disabled={isLoading}
								>
									{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
								</button>
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
							{isLoading ? "Signing In..." : "Sign In"}
						</button>
					</form>
					
					<div className="auth-footer">
						<p>
							Don't have an account?{" "}
							<Link to="/register" className="link-btn">
								Sign up
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LoginPage;