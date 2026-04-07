import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "@/assets/image.png";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { authService } from "@/services/authService";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Live Data", href: "/live" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Chart", href: "/chart" },
  { name: "History", href: "/history" },
];

export const Navbar = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Check authentication status
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  const handleAuthClick = () => {
    if (isAuthenticated) {
      authService.logout();
      setIsAuthenticated(false);
      navigate('/');
    } else {
      navigate('/login');
    }
  };
  return (
    <nav
      className={cn(
        "fixed w-full z-40 transition-all duration-300 py-4",
        isScrolled 
          ? "bg-background/95 backdrop-blur-lg shadow-lg border-b border-border/50" 
          : "bg-transparent"
      )}
    >
      <div className="container flex items-center justify-between">
        <Link
          className="text-xl font-bold text-primary flex items-center gap-2"
          to="/"
        >
          <img 
            src={logo} 
            alt="Portfolio Logo" 
            className="h-10 w-25 object-contain"
          />
        </Link>

        {/* desktop nav */}
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item, key) => (
            <Link
              key={key}
              to={item.href}
              className="text-foreground/80 hover:text-primary transition-colors duration-300"
            >
              {item.name}
            </Link>
          ))}
          
          {/* Auth button */}
          <button
            onClick={handleAuthClick}
            className="text-foreground/80 hover:text-primary transition-colors duration-300"
          >
            {isAuthenticated ? 'Đăng xuất' : 'Đăng nhập'}
          </button>
          
          <ThemeToggle />
        </div>

        {/* mobile nav */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="p-2 text-foreground z-50"
            aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}{" "}
          </button>
        </div>

        <div
          className={cn(
            "fixed top-0 left-0 w-full h-screen bg-background/95 backdrop-blur-md z-40 flex flex-col items-center justify-center",
            "transition-all duration-300 md:hidden",
            isMenuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          )}
        >
          <div className="flex flex-col space-y-8 text-xl">
            {navItems.map((item, key) => (
              <Link
                key={key}
                to={item.href}
                className="text-foreground/80 hover:text-primary transition-colors duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Mobile Auth button */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleAuthClick();
              }}
              className="text-foreground/80 hover:text-primary transition-colors duration-300"
            >
              {isAuthenticated ? 'Đăng xuất' : 'Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
