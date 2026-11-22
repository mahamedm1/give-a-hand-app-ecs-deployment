import React from 'react';
import { FaClock, FaCheck, FaTimes, FaExchangeAlt } from 'react-icons/fa';

const SwapStatusBadge = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'pending':
        return {
          text: 'Pending',
          icon: <FaClock className="mr-1" />,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        };
      case 'accepted':
        return {
          text: 'Accepted',
          icon: <FaCheck className="mr-1" />,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'rejected':
        return {
          text: 'Rejected',
          icon: <FaTimes className="mr-1" />,
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      case 'cancelled':
        return {
          text: 'Cancelled',
          icon: <FaTimes className="mr-1" />,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200'
        };
      case 'completed':
        return {
          text: 'Completed',
          icon: <FaExchangeAlt className="mr-1" />,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
      default:
        return {
          text: 'Unknown',
          icon: <FaClock className="mr-1" />,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor}`}>
      {statusInfo.icon}
      {statusInfo.text}
    </span>
  );
};

export default SwapStatusBadge; 