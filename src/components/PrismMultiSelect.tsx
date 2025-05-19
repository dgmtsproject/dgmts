import React, { useState, useRef, useEffect } from 'react';

interface PrismMultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const PrismsMultiSelect: React.FC<PrismMultiSelectProps> = ({ options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: { target: any; }) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  return (
    <div 
      ref={dropdownRef}
      style={{
        position: 'relative',
        width: '200px',
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.375rem",
          padding: "0.5rem",
          fontSize: "0.875rem",
          color: "#374151",
          backgroundColor: "#f9fafb",
          outline: "none",
          transition: "border-color 0.2s ease",
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        <span>
          {selected.length > 0 
            ? `${selected.length} selected` 
            : 'Select Prisms'}
        </span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="#374151"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s ease',
          }}
        >
          <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
        </svg>
      </div>
      
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: '4px',
          }}
        >
          {options.map((option) => (
            <div
              key={option}
              style={{
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                backgroundColor: selected.includes(option) ? '#f0f7ff' : 'transparent',
              }}
              onClick={() => toggleOption(option)}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0f7ff')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = selected.includes(option) ? '#f0f7ff' : 'transparent')}
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                readOnly
                style={{
                  marginRight: '0.5rem',
                  cursor: 'pointer',
                }}
              />
              <span>{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default PrismsMultiSelect;