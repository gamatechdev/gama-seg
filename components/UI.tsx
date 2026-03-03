import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-[24px] shadow-ios-card p-6 border border-white/40 ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyle = "px-6 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-ios-blue text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:bg-blue-600",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-ios-blue hover:bg-blue-50"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: React.ReactNode }> = ({ label, icon, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 mb-4 w-full">
    {label && <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">{label}</label>}
    <div className="relative group z-0">
        {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ios-blue transition-colors">
                {icon}
            </div>
        )}
        <input 
        className={`w-full bg-gray-50/80 border border-gray-200 rounded-2xl ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3.5 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-ios-blue focus:ring-4 focus:ring-blue-500/10 transition-all outline-none ${className}`}
        {...props}
        />
    </div>
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; icon?: React.ReactNode }> = ({ label, icon, children, className = '', value, onChange, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract options from children
  const options = React.Children.toArray(children).map((child) => {
     if (!React.isValidElement(child)) return null;
     const props = child.props as { value?: any; children?: any };
     return {
        value: props.value,
        label: props.children,
        key: child.key || props.value
     };
  }).filter((opt): opt is { value: any; label: any; key: any } => opt !== null);

  const selectedOption = options.find((opt: any) => String(opt.value) === String(value));
  // If no selection, show the first option if it's a placeholder (often empty value), or just 'Selecione'
  const displayText = selectedOption ? selectedOption.label : (options.length > 0 && options[0].value === "" ? options[0].label : 'Selecione...');

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
        setSearchTerm('');
    } else {
        // Auto focus search input when opened
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 100);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: any) => {
    // Create a synthetic event to match the expected interface of HTMLSelectElement onChange
    const syntheticEvent = {
      target: { value: optionValue },
      currentTarget: { value: optionValue },
    } as unknown as React.ChangeEvent<HTMLSelectElement>;

    if (onChange) onChange(syntheticEvent);
    setIsOpen(false);
  };

  const filteredOptions = options.filter((opt: any) => 
    String(opt.label).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`flex flex-col gap-1.5 mb-4 w-full relative ${isOpen ? 'z-50' : 'z-10'}`} ref={containerRef}>
      {label && <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1">{label}</label>}
      
      <div 
        className={`relative group cursor-pointer select-none`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {icon && (
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${isOpen ? 'text-ios-blue' : 'text-gray-400'}`}>
                {icon}
            </div>
        )}
        
        <div className={`w-full bg-gray-50/80 border ${isOpen ? 'border-ios-blue ring-4 ring-blue-500/10 bg-white shadow-lg' : 'border-gray-200 hover:border-gray-300'} rounded-2xl ${icon ? 'pl-11' : 'pl-4'} pr-10 py-3.5 text-gray-900 text-sm transition-all duration-200 flex items-center min-h-[50px]`}>
            <span className={`block truncate ${selectedOption ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {displayText}
            </span>
        </div>

        <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-ios-blue' : ''}`}>
           <ChevronDown size={18} strokeWidth={2.5} />
        </div>
      </div>

      <div className={`absolute top-[110%] left-0 right-0 bg-white/95 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-ios-float overflow-hidden transition-all duration-200 origin-top flex flex-col ${isOpen ? 'opacity-100 scale-100 visible translate-y-0' : 'opacity-0 scale-95 invisible -translate-y-2'}`}>
            
            {/* Search Bar */}
            <div className="p-3 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-20" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        ref={searchInputRef}
                        type="text"
                        placeholder="Pesquisar..."
                        className="w-full bg-gray-100/80 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt: any) => {
                        const isSelected = String(opt.value) === String(value);
                        return (
                            <div 
                                key={opt.key}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(opt.value);
                                }}
                                className={`px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-all flex items-center justify-between group ${isSelected ? 'bg-ios-blue text-white shadow-md shadow-blue-500/20' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                <span className="font-medium truncate mr-2">{opt.label}</span>
                                {isSelected && <Check size={16} strokeWidth={3} className="text-white" />}
                            </div>
                        );
                    })
                ) : (
                    <div className="p-4 text-center text-xs text-gray-400 font-medium">
                        Nenhum resultado encontrado
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export const Toggle: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; description?: string }> = ({ label, checked, onChange, description }) => (
    <div 
        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${checked ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
        onClick={() => onChange(!checked)}
    >
        <div className="flex flex-col">
            <span className={`font-semibold text-sm ${checked ? 'text-ios-blue' : 'text-gray-700'}`}>{label}</span>
            {description && <span className="text-xs text-gray-400 mt-0.5">{description}</span>}
        </div>
        <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 flex items-center ${checked ? 'bg-ios-blue' : 'bg-gray-200'}`}>
            <div className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
    </div>
);

export const Badge: React.FC<{ status: string }> = ({ status }) => {
    let color = 'bg-gray-100 text-gray-600 border-gray-200';
    const s = status.toLowerCase();
    
    if (s.includes('pendente')) color = 'bg-yellow-50 text-yellow-700 border-yellow-100';
    if (s.includes('entregue') || s.includes('concluido') || s.includes('ok') || s.includes('presente')) color = 'bg-green-50 text-green-700 border-green-100';
    if (s.includes('atrasado') || s.includes('cancelado') || s.includes('ausente') || s.includes('vencido')) color = 'bg-red-50 text-red-700 border-red-100';

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${color}`}>
            {status}
        </span>
    );
}

export const GlassHeader: React.FC<{ title: string; actions?: React.ReactNode }> = ({ title, actions }) => (
  <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-5 bg-ios-glass backdrop-blur-xl border-b border-white/20 mb-6">
    <h1 className="text-2xl font-bold text-ios-text tracking-tight">{title}</h1>
    <div className="flex items-center gap-3">
      {actions}
    </div>
  </header>
);