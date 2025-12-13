import './LoginPage.css';
import logo from "@/assets/image.png";
import bg from "@/assets/bg.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";

export const LoginPage = () => {
  const navigate = useNavigate();
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      return 'Email không được để trống';
    }
    const validDomain = '@sis.hust.edu.vn';
    if (!email.endsWith(validDomain)) {
      return `Email phải có đuôi ${validDomain}`;
    }
    return '';
  };

  const validatePassword = (password) => {
    if (!password || password.trim() === '') {
      return 'Mật khẩu không được để trống';
    }
    return '';
  };

  const handleEmailBlur = (e) => {
    const email = e.target.value;
    const error = validateEmail(email);
    setEmailError(error);
  };

  const handlePasswordBlur = (e) => {
    const password = e.target.value;
    const error = validatePassword(password);
    setPasswordError(error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    
    // Validate all fields
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    
    if (emailErr || passwordErr) {
      return;
    }
    
    // Call API
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      alert('Đăng nhập thành công!');
      console.log('Login response:', data);
      // Redirect to dashboard page
      navigate('/');
    } catch (error) {
      alert(error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    if (emailError) {
      setEmailError('');
    }
  };

  const handlePasswordChange = (e) => {
    if (passwordError) {
      setPasswordError('');
    }
  };

  return (
    <div className="login-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="login-card">
        <img
          alt="HUST Logo"
          className="logo"
          src={logo}
        />
        <h2>Đăng nhập HUST</h2>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="email"
              id="email"
              name="email"
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              className="w-full px-4 py-3 rounded-md border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary peer"
              placeholder=" "
            />
            <label
              htmlFor="email"
              className="absolute left-4 top-3 text-muted-foreground transition-all duration-200 peer-focus:top-[-10px] peer-focus:left-3 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-background peer-focus:px-1 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-background peer-[:not(:placeholder-shown)]:px-1"
            >
              Email sinh viên
            </label>
            {emailError && (
              <p className="error-message">{emailError}</p>
            )}
          </div>

          <div className="relative">
            <input
              type="password"
              id="password"
              name="password"
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              className="w-full px-4 py-3 rounded-md border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary peer"
              placeholder=" "
            />
            <label
              htmlFor="password"
              className="absolute left-4 top-3 text-muted-foreground transition-all duration-200 peer-focus:top-[-10px] peer-focus:left-3 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-background peer-focus:px-1 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-background peer-[:not(:placeholder-shown)]:px-1"
            >
              Mật khẩu
            </label>
            {passwordError && (
              <p className="error-message">{passwordError}</p>
            )}
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
};
