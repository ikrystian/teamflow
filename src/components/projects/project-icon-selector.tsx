"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
  X,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Octagon
} from "lucide-react"
import { cn } from '@/lib/utils'

const PROJECT_ICONS = [
  { name: 'Briefcase', icon: Briefcase, category: 'Business' },
  { name: 'Target', icon: Target, category: 'Business' },
  { name: 'Rocket', icon: Rocket, category: 'Business' },
  { name: 'TrendingUp', icon: TrendingUp, category: 'Business' },
  { name: 'BarChart', icon: BarChart, category: 'Business' },
  { name: 'PieChart', icon: PieChart, category: 'Business' },
  { name: 'DollarSign', icon: DollarSign, category: 'Business' },
  { name: 'Building', icon: Building, category: 'Business' },
  { name: 'Handshake', icon: Handshake, category: 'Business' },

  { name: 'Star', icon: Star, category: 'Popular' },
  { name: 'Heart', icon: Heart, category: 'Popular' },
  { name: 'Zap', icon: Zap, category: 'Popular' },
  { name: 'Trophy', icon: Trophy, category: 'Popular' },
  { name: 'Crown', icon: Crown, category: 'Popular' },
  { name: 'Diamond', icon: Diamond, category: 'Popular' },
  { name: 'Gem', icon: Gem, category: 'Popular' },
  { name: 'Sparkles', icon: Sparkles, category: 'Popular' },
  { name: 'Flame', icon: Flame, category: 'Popular' },

  { name: 'Lightbulb', icon: Lightbulb, category: 'Creative' },
  { name: 'Palette', icon: Palette, category: 'Creative' },
  { name: 'Brush', icon: Brush, category: 'Creative' },
  { name: 'Pen', icon: Pen, category: 'Creative' },
  { name: 'Camera', icon: Camera, category: 'Creative' },
  { name: 'Music', icon: Music, category: 'Creative' },
  { name: 'Book', icon: Book, category: 'Creative' },
  { name: 'GraduationCap', icon: GraduationCap, category: 'Creative' },

  { name: 'Laptop', icon: Laptop, category: 'Technology' },
  { name: 'Monitor', icon: Monitor, category: 'Technology' },
  { name: 'Smartphone', icon: Smartphone, category: 'Technology' },
  { name: 'Settings', icon: Settings, category: 'Technology' },
  { name: 'Cog', icon: Cog, category: 'Technology' },
  { name: 'Wifi', icon: Wifi, category: 'Technology' },
  { name: 'Battery', icon: Battery, category: 'Technology' },
  { name: 'Gamepad2', icon: Gamepad2, category: 'Technology' },

  { name: 'Users', icon: Users, category: 'Team' },
  { name: 'User', icon: User, category: 'Team' },
  { name: 'UserCheck', icon: UserCheck, category: 'Team' },
  { name: 'UserPlus', icon: UserPlus, category: 'Team' },
  { name: 'Team', icon: Users, category: 'Team' },
  { name: 'ThumbsUp', icon: ThumbsUp, category: 'Team' },

  { name: 'Sun', icon: Sun, category: 'Nature' },
  { name: 'Moon', icon: Moon, category: 'Nature' },
  { name: 'Cloud', icon: Cloud, category: 'Nature' },
  { name: 'Mountain', icon: Mountain, category: 'Nature' },
  { name: 'TreePine', icon: TreePine, category: 'Nature' },
  { name: 'Flower', icon: Flower, category: 'Nature' },
  { name: 'Leaf', icon: Leaf, category: 'Nature' },
  { name: 'Apple', icon: Apple, category: 'Nature' },

  { name: 'Home', icon: Home, category: 'Places' },
  { name: 'MapPin', icon: MapPin, category: 'Places' },
  { name: 'Globe', icon: Globe, category: 'Places' },
  { name: 'Compass', icon: Compass, category: 'Places' },
  { name: 'Flag', icon: Flag, category: 'Places' },

  { name: 'Car', icon: Car, category: 'Transport' },
  { name: 'Plane', icon: Plane, category: 'Transport' },
  { name: 'Ship', icon: Ship, category: 'Transport' },
  { name: 'Train', icon: Train, category: 'Transport' },
  { name: 'Bike', icon: Bike, category: 'Transport' },

  { name: 'Calendar', icon: Calendar, category: 'Time' },
  { name: 'Clock', icon: Clock, category: 'Time' },
  { name: 'Timer', icon: Timer, category: 'Time' },
  { name: 'Stopwatch', icon: Timer, category: 'Time' },

  { name: 'CheckCircle', icon: CheckCircle, category: 'Status' },
  { name: 'XCircle', icon: XCircle, category: 'Status' },
  { name: 'AlertCircle', icon: AlertCircle, category: 'Status' },
  { name: 'Info', icon: Info, category: 'Status' },
  { name: 'HelpCircle', icon: HelpCircle, category: 'Status' },

  { name: 'Circle', icon: Circle, category: 'Shapes' },
  { name: 'Square', icon: Square, category: 'Shapes' },
  { name: 'Triangle', icon: Triangle, category: 'Shapes' },
  { name: 'Hexagon', icon: Hexagon, category: 'Shapes' },
  { name: 'Octagon', icon: Octagon, category: 'Shapes' },
]

const CATEGORIES = [
  'Popular',
  'Business',
  'Creative',
  'Technology',
  'Team',
  'Nature',
  'Places',
  'Transport',
  'Time',
  'Status',
  'Shapes'
]

interface ProjectIconSelectorProps {
  selectedIcon?: string | null
  onIconChange?: (iconName: string | null) => void
  className?: string
}

export function ProjectIconSelector({
  selectedIcon,
  onIconChange,
  className
}: ProjectIconSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState('Popular')

  const filteredIcons = PROJECT_ICONS.filter(icon => icon.category === selectedCategory)

  const handleIconSelect = (iconName: string) => {
    onIconChange?.(iconName === selectedIcon ? null : iconName)
  }

  const getIconComponent = (iconName: string) => {
    const iconData = PROJECT_ICONS.find(icon => icon.name === iconName)
    if (!iconData) return null
    const IconComponent = iconData.icon
    return <IconComponent className="h-4 w-4" />
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label className="text-sm font-medium">Ikona projektu</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Wybierz ikonę, która będzie wyświetlana obok nazwy projektu
        </p>
      </div>

      {/* Wybrana ikona */}
      {selectedIcon && (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-sm bg-background border">
            {getIconComponent(selectedIcon)}
          </div>
          <span className="text-sm">{selectedIcon}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onIconChange?.(null)}
            className="ml-auto h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Kategorie */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((category) => (
          <Button
            key={category}
            type="button"
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="text-xs h-7"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Siatka ikon */}
      <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md bg-muted/20">
        {filteredIcons.map((iconData) => {
          const IconComponent = iconData.icon
          const isSelected = selectedIcon === iconData.name

          return (
            <Button
              key={iconData.name}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleIconSelect(iconData.name)}
              className={cn(
                "h-10 w-10 p-0 hover:bg-accent",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              title={iconData.name}
            >
              <IconComponent className="h-4 w-4" />
            </Button>
          )
        })}
      </div>
    </div>
  )
}
