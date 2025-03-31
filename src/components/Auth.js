import React, { useState } from 'react';
import { signIn, signUp, resetPassword } from '../services/supabase-service';
import './Auth.css';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetMode, setResetMode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (resetMode) {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setMessage('Password reset instructions sent to your email!');
      } else if (isLogin) {
        const { data, error } = await signIn(email, password);
        if (error) throw error;
        onAuthSuccess(data);
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const { data, error } = await signUp(email, password);
        if (error) throw error;
        setMessage('Please check your email for verification link!');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{resetMode ? 'Reset Password' : (isLogin ? 'Login' : 'Sign Up')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label>Email</label>
          </div>
          {!resetMode && (
            <div className="form-group">
              <input
                type="password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label>Password</label>
            </div>
          )}
          {!isLogin && !resetMode && (
            <div className="form-group">
              <input
                type="password"
                placeholder=" "
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <label>Confirm Password</label>
            </div>
          )}
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : (resetMode ? 'Send Reset Link' : (isLogin ? 'Login' : 'Sign Up'))}
          </button>
        </form>
        {message && <p className="message">{message}</p>}
        {!resetMode ? (
          <p className="auth-switch">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        ) : null}
        <p className="auth-switch">
          <button onClick={() => setResetMode(!resetMode)}>
            {resetMode ? 'Back to Login' : 'Forgot Password?'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;