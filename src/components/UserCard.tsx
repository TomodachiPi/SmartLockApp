import React from 'react';
import trash_png from "./../assets/images/trash.png";

interface UserCardProps {
  label: string;
  time: string;
  color: string;
  onDelete?: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  label,
  time,
  color,
  onDelete,
}) => {
  return (
    <div
      id={`user-card-${label.replace(/[^a-zA-Z0-9]/g, '')}`}
      className="bg-[#16213e] rounded-xl p-4 shadow-md border-l-4 transition-all hover:translate-x-1"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-wide">{label}</h3>
          <p className="text-sm text-[#a0a0b0] mt-1">{time}</p>
        </div>
        {onDelete && (
          <button
            id={`delete-user-schedule-${label}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-white/40 hover:text-[#ff5252] p-2 rounded-lg transition-colors cursor-pointer"
            title="Delete user schedule"
          >
            <img src={trash_png} alt="Delete" className="w-5 h-5 object-contain" />
          </button>
        )}
      </div>
    </div>
  );
};
