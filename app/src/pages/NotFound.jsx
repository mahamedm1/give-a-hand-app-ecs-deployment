import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <p className="text-6xl font-bold text-orange-500">404</p>
      <h1 className="text-2xl font-semibold mt-4">Page not found</h1>
      <p className="text-gray-600 mt-2">The page you're looking for doesn't exist or has moved.</p>
      <div className="mt-6 flex justify-center gap-4">
        <Link to="/" className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600">Go home</Link>
        <Link to="/tasks" className="border border-orange-500 text-orange-500 px-4 py-2 rounded-md hover:bg-orange-50">Find tasks</Link>
      </div>
    </div>
  );
}

export default NotFound;
