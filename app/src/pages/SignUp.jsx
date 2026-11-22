import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import SkillPicker from '../components/SkillPicker';

function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    phone_number: '',
    city: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [skills, setSkills] = useState([]);
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // FR-1: reject empty mandatory fields and passwords under 8 characters
    const required = ['first_name', 'last_name', 'username', 'email', 'password', 'city'];
    if (required.some(field => !String(formData[field] || '').trim())) {
      setError('Please fill in all required fields.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;

      if (!authData.user) {
        setLoading(false);
        setError("Please check your email to confirm your account before continuing.");
        return;
      }

      const { error: insertError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        display_name: formData.username,
        city: formData.city,
        phone_number: formData.phone_number || null,
        skills
      });

      if (insertError) throw insertError;

      navigate('/signup-success', { state: { email: formData.email } });
    } catch (err) {
      console.error('Signup Error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Create an Account</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium">First Name</label>
          <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div>
          <label htmlFor="last_name" className="block text-sm font-medium">Last Name</label>
          <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium">Username</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={8} placeholder="At least 8 characters" className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div>
          <label htmlFor="phone_number" className="block text-sm font-medium">Phone Number <span className="text-gray-400">(optional)</span></label>
          <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium">City / Area</label>
          <input type="text" name="city" value={formData.city} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div>
          <span className="block text-sm font-medium mb-1">I can help with <span className="text-gray-400">(optional)</span></span>
          <SkillPicker value={skills} onChange={setSkills} />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1" required />
          <span>I agree to the <Link to="/terms" className="text-orange-600 underline" target="_blank">Terms of Service</Link> and <Link to="/privacy" className="text-orange-600 underline" target="_blank">Privacy Policy</Link>.</span>
        </label>

        <button type="submit" disabled={loading}
          className={`w-full py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition ${loading ? 'opacity-60' : ''}`}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-6 text-center text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-orange-500 font-medium hover:underline">Log in</Link>
      </p>
    </div>
  );
}

export default SignUp;