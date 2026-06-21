import './LoginPage.css';
import logo from "@/assets/image.png";
import bg from "@/assets/bg.png";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
      console.log('Login response:', data);
      // Redirect to homepage page with state to show toast
      navigate('/', { state: { loginSuccess: true } });
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
      {/* Navbar quay về trang chủ */}
      <nav className="absolute top-0 left-0 w-full bg-white border-b border-gray-200 py-4 z-10">
        <div className="container">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center">
              <img 
                src={logo} 
                alt="Logo" 
                className="h-10 w-25 object-contain hover:opacity-80 transition-opacity"
              />
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <span className="text-lg md:text-xl font-semibold text-gray-800">
              Đăng nhập
            </span>
          </div>
        </div>
      </nav>

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
              placeholder=" "
            />
            <label htmlFor="email">
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
              placeholder=" "
            />
            <label htmlFor="password">
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
