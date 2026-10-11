import React from 'react';
import hijinLogoImg from '../../assets/hijin_logo.png';
import {
  MessageSquare,
  Folder,
  CheckSquare,
  FileText,
  FileSpreadsheet,
  FileCode,
  Settings,
  User,
  Paperclip,
  Image as ImageIcon,
  Trash2,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Download,
  Copy,
  Check,
  Square,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Cpu,
  Zap,
  ShieldCheck,
  Sparkles,
  Sliders,
  Activity,
  ArrowUp,
  ArrowLeft,
  ExternalLink,
  BarChart3,
  TrendingUp,
  Maximize2,
  Minimize2,
  Palette,
  Search,
  Plus,
  Compass,
  FileCheck,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Lock,
  Key,
  LucideProps,
} from 'lucide-react';

export interface IconProps extends LucideProps {
  className?: string;
  size?: number;
  title?: string;
}

// Brand Logo: Official Hijin 3D Wave "H" Emblem
export const BrandIcon: React.FC<IconProps> = ({ size = 20, className = '', title = 'Hijin', style = {} }) => {
  const radius = Math.max(4, Math.round(size * 0.22));
  return (
    <span
      className={`hijin-brand-badge ${className}`}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: `${radius}px`,
        overflow: 'hidden',
        background: '#040711',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.25)',
        flexShrink: 0,
        verticalAlign: 'middle',
        ...style,
      }}
    >
      <img
        src={hijinLogoImg}
        alt={title}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </span>
  );
};

// Navigation & Workspace Icons
export const ChatIcon: React.FC<IconProps> = (props) => <MessageSquare size={props.size || 16} strokeWidth={1.75} {...props} />;
export const ProjectsIcon: React.FC<IconProps> = (props) => <Folder size={props.size || 16} strokeWidth={1.75} {...props} />;
export const TasksIcon: React.FC<IconProps> = (props) => <CheckSquare size={props.size || 16} strokeWidth={1.75} {...props} />;
export const ArtifactsIcon: React.FC<IconProps> = (props) => <FileText size={props.size || 16} strokeWidth={1.75} {...props} />;
export const SpreadsheetIcon: React.FC<IconProps> = (props) => <FileSpreadsheet size={props.size || 16} strokeWidth={1.75} {...props} />;
export const CodeIcon: React.FC<IconProps> = (props) => <FileCode size={props.size || 16} strokeWidth={1.75} {...props} />;
export const SettingsIcon: React.FC<IconProps> = (props) => <Settings size={props.size || 16} strokeWidth={1.75} {...props} />;
export const AccountIcon: React.FC<IconProps> = (props) => <User size={props.size || 16} strokeWidth={1.75} {...props} />;
export const PlusIcon: React.FC<IconProps> = (props) => <Plus size={props.size || 16} strokeWidth={2} {...props} />;
export const SearchIcon: React.FC<IconProps> = (props) => <Search size={props.size || 15} strokeWidth={1.75} {...props} />;
export const CompassIcon: React.FC<IconProps> = (props) => <Compass size={props.size || 16} strokeWidth={1.75} {...props} />;
export const FileCheckIcon: React.FC<IconProps> = (props) => <FileCheck size={props.size || 16} strokeWidth={1.75} {...props} />;

// Action & Tool Icons
export const SendIcon: React.FC<IconProps> = (props) => <ArrowUp size={props.size || 16} strokeWidth={2.2} {...props} />;
export const AttachFileIcon: React.FC<IconProps> = (props) => <Paperclip size={props.size || 15} strokeWidth={1.75} {...props} />;
export const AttachImageIcon: React.FC<IconProps> = (props) => <ImageIcon size={props.size || 15} strokeWidth={1.75} {...props} />;
export const DeleteIcon: React.FC<IconProps> = (props) => <Trash2 size={props.size || 14} strokeWidth={1.75} {...props} />;
export const EditIcon: React.FC<IconProps> = (props) => <Edit3 size={props.size || 14} strokeWidth={1.75} {...props} />;
export const CloseIcon: React.FC<IconProps> = (props) => <X size={props.size || 16} strokeWidth={1.75} {...props} />;
export const RefreshIcon: React.FC<IconProps> = (props) => <RotateCw size={props.size || 15} strokeWidth={1.75} {...props} />;
export const DownloadIcon: React.FC<IconProps> = (props) => <Download size={props.size || 15} strokeWidth={1.75} {...props} />;
export const CopyIcon: React.FC<IconProps> = (props) => <Copy size={props.size || 14} strokeWidth={1.75} {...props} />;
export const CheckIcon: React.FC<IconProps> = (props) => <Check size={props.size || 14} strokeWidth={2} {...props} />;
export const StopIcon: React.FC<IconProps> = (props) => <Square size={props.size || 14} strokeWidth={2} {...props} />;
export const ExternalLinkIcon: React.FC<IconProps> = (props) => <ExternalLink size={props.size || 12} strokeWidth={1.75} {...props} />;
export const BackIcon: React.FC<IconProps> = (props) => <ArrowLeft size={props.size || 16} strokeWidth={1.75} {...props} />;

// Layout & Navigation Arrows
export const ChevronLeftIcon: React.FC<IconProps> = (props) => <ChevronLeft size={props.size || 16} strokeWidth={1.75} {...props} />;
export const ChevronRightIcon: React.FC<IconProps> = (props) => <ChevronRight size={props.size || 16} strokeWidth={1.75} {...props} />;
export const ChevronDownIcon: React.FC<IconProps> = (props) => <ChevronDown size={props.size || 16} strokeWidth={1.75} {...props} />;
export const ChevronUpIcon: React.FC<IconProps> = (props) => <ChevronUp size={props.size || 16} strokeWidth={1.75} {...props} />;
export const MaximizeIcon: React.FC<IconProps> = (props) => <Maximize2 size={props.size || 15} strokeWidth={1.75} {...props} />;
export const MinimizeIcon: React.FC<IconProps> = (props) => <Minimize2 size={props.size || 15} strokeWidth={1.75} {...props} />;

// Status, Security & Telemetry Icons
export const VerifiedIcon: React.FC<IconProps> = (props) => <CheckCircle2 size={props.size || 14} strokeWidth={2} {...props} />;
export const ErrorIcon: React.FC<IconProps> = (props) => <AlertCircle size={props.size || 16} strokeWidth={1.75} {...props} />;
export const WarningIcon: React.FC<IconProps> = (props) => <AlertTriangle size={props.size || 16} strokeWidth={1.75} {...props} />;
export const GpuIcon: React.FC<IconProps> = (props) => <Zap size={props.size || 15} strokeWidth={1.75} {...props} />;
export const CpuIcon: React.FC<IconProps> = (props) => <Cpu size={props.size || 15} strokeWidth={1.75} {...props} />;
export const SecurityIcon: React.FC<IconProps> = (props) => <ShieldCheck size={props.size || 16} strokeWidth={1.75} {...props} />;
export const AutoRouteIcon: React.FC<IconProps> = (props) => <Cpu size={props.size || 14} strokeWidth={1.75} {...props} />;
export const ActivityIcon: React.FC<IconProps> = (props) => <Activity size={props.size || 16} strokeWidth={1.75} {...props} />;
export const SparklesIcon: React.FC<IconProps> = (props) => <Sparkles size={props.size || 16} strokeWidth={1.75} {...props} />;
export const SlidersIcon: React.FC<IconProps> = (props) => <Sliders size={props.size || 16} strokeWidth={1.75} {...props} />;
export const PaletteIcon: React.FC<IconProps> = (props) => <Palette size={props.size || 15} strokeWidth={1.75} {...props} />;
export const ChartIcon: React.FC<IconProps> = (props) => <BarChart3 size={props.size || 16} strokeWidth={1.75} {...props} />;
export const TrendIcon: React.FC<IconProps> = (props) => <TrendingUp size={props.size || 16} strokeWidth={1.75} {...props} />;
export const SunIcon: React.FC<IconProps> = (props) => <Sun size={props.size || 16} strokeWidth={1.75} {...props} />;
export const MoonIcon: React.FC<IconProps> = (props) => <Moon size={props.size || 16} strokeWidth={1.75} {...props} />;
export const EyeIcon: React.FC<IconProps> = (props) => <Eye size={props.size || 16} strokeWidth={1.75} {...props} />;
export const EyeOffIcon: React.FC<IconProps> = (props) => <EyeOff size={props.size || 16} strokeWidth={1.75} {...props} />;
export const LockIcon: React.FC<IconProps> = (props) => <Lock size={props.size || 16} strokeWidth={1.75} {...props} />;
export const KeyIcon: React.FC<IconProps> = (props) => <Key size={props.size || 16} strokeWidth={1.75} {...props} />;
