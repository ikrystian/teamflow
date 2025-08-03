'use client'

import {
  Briefcase,
  Target,
  Rocket,
  Star,
  Heart,
  Zap,
  Trophy,
  Crown,
  Diamond,
  Gem,
  Sparkles,
  Flame,
  Sun,
  Moon,
  Cloud,
  Mountain,
  TreePine,
  Flower,
  Leaf,
  Apple,
  Camera,
  Music,
  Palette,
  Brush,
  Pen,
  Book,
  GraduationCap,
  Building,
  Home,
  Car,
  Plane,
  Ship,
  Train,
  Bike,
  MapPin,
  Globe,
  Compass,
  Flag,
  Settings,
  Cog,
  Lightbulb,
  Battery,
  Wifi,
  Smartphone,
  Laptop,
  Monitor,
  Gamepad2,
  DollarSign,
  TrendingUp,
  BarChart,
  PieChart,
  Calendar,
  Clock,
  Timer,
  Users,
  User,
  UserCheck,
  UserPlus,
  Handshake,
  ThumbsUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  HelpCircle,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Octagon,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const PROJECT_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Target', icon: Target },
  { name: 'Rocket', icon: Rocket },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'BarChart', icon: BarChart },
  { name: 'PieChart', icon: PieChart },
  { name: 'DollarSign', icon: DollarSign },
  { name: 'Building', icon: Building },
  { name: 'Handshake', icon: Handshake },
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'Zap', icon: Zap },
  { name: 'Trophy', icon: Trophy },
  { name: 'Crown', icon: Crown },
  { name: 'Diamond', icon: Diamond },
  { name: 'Gem', icon: Gem },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Flame', icon: Flame },
  { name: 'Lightbulb', icon: Lightbulb },
  { name: 'Palette', icon: Palette },
  { name: 'Brush', icon: Brush },
  { name: 'Pen', icon: Pen },
  { name: 'Camera', icon: Camera },
  { name: 'Music', icon: Music },
  { name: 'Book', icon: Book },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Laptop', icon: Laptop },
  { name: 'Monitor', icon: Monitor },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Settings', icon: Settings },
  { name: 'Cog', icon: Cog },
  { name: 'Wifi', icon: Wifi },
  { name: 'Battery', icon: Battery },
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'Users', icon: Users },
  { name: 'User', icon: User },
  { name: 'UserCheck', icon: UserCheck },
  { name: 'UserPlus', icon: UserPlus },
  { name: 'Team', icon: Users },
  { name: 'ThumbsUp', icon: ThumbsUp },
  { name: 'Sun', icon: Sun },
  { name: 'Moon', icon: Moon },
  { name: 'Cloud', icon: Cloud },
  { name: 'Mountain', icon: Mountain },
  { name: 'TreePine', icon: TreePine },
  { name: 'Flower', icon: Flower },
  { name: 'Leaf', icon: Leaf },
  { name: 'Apple', icon: Apple },
  { name: 'Home', icon: Home },
  { name: 'MapPin', icon: MapPin },
  { name: 'Globe', icon: Globe },
  { name: 'Compass', icon: Compass },
  { name: 'Flag', icon: Flag },
  { name: 'Car', icon: Car },
  { name: 'Plane', icon: Plane },
  { name: 'Ship', icon: Ship },
  { name: 'Train', icon: Train },
  { name: 'Bike', icon: Bike },
  { name: 'Calendar', icon: Calendar },
  { name: 'Clock', icon: Clock },
  { name: 'Timer', icon: Timer },
  { name: 'Stopwatch', icon: Timer },
  { name: 'CheckCircle', icon: CheckCircle },
  { name: 'XCircle', icon: XCircle },
  { name: 'AlertCircle', icon: AlertCircle },
  { name: 'Info', icon: Info },
  { name: 'HelpCircle', icon: HelpCircle },
  { name: 'Circle', icon: Circle },
  { name: 'Square', icon: Square },
  { name: 'Triangle', icon: Triangle },
  { name: 'Hexagon', icon: Hexagon },
  { name: 'Octagon', icon: Octagon },
];

interface ProjectIconProps {
  iconName: string | null;
  color?: string | null;
  className?: string;
}

export function ProjectIcon({ iconName, color, className }: ProjectIconProps) {
  if (!iconName) {
    // Return a default icon if iconName is null
    return <Briefcase className={cn("w-4 h-4 flex-shrink-0", className)} style={{ color: color || undefined }} />;
  }

  const iconData = PROJECT_ICONS.find(icon => icon.name === iconName);

  if (!iconData) {
    // Return a default icon if not found
    return <Briefcase className={cn("w-4 h-4 flex-shrink-0", className)} style={{ color: color || undefined }} />;
  }

  const IconComponent = iconData.icon;

  return (
    <IconComponent
      className={cn("w-4 h-4 flex-shrink-0", className)}
      style={{ color: color || undefined }}
    />
  );
}
