import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get token from URL params
    const token = searchParams.get('token');

    if (token) {
      // Store token in localStorage
      localStorage.setItem('token', token);
      toast.success('Successfully logged in with Google! 🎉');
      
      // Redirect to home page after a brief delay
      setTimeout(() => {
        navigate('/', { replace: true });
        window.location.reload(); // Reload to update auth state
      }, 1000);
    } else {
      // If no token, redirect to login with error
      toast.error('Authentication failed. Please try again.');
      navigate('/login?error=authentication_failed', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="inline-block w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mb-4"
        />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Authentication Successful!
        </h2>
        <p className="text-gray-600">
          Redirecting you to the home page...
        </p>
      </motion.div>
    </div>
  );
};

export default GoogleAuthSuccess;
