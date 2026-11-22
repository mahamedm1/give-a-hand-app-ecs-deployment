import { Link } from 'react-router-dom';

function ResetSuccess() {
  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-lg shadow-md text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">Registration Successful!</h1>

      <div className="my-6 flex justify-center">
        <div className="rounded-full bg-green-100 p-3">
          <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <p className="text-gray-600 mb-6">
        Thank you for resetting your password. Please login with your new password to continue using our services.
      </p>

      <div className="mt-8 space-y-3">
        <Link
          to="/login"
          className="block w-full py-3 px-4 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          Log In
        </Link>

        <Link
          to="/"
          className="block w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}

export default ResetSuccess; 