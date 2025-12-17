# 3D Maze Game - Player Guide

A thrilling 3D maze adventure where you collect pellets while avoiding intelligent AI ghosts in dynamically generated mazes!

## 🎮 Game Overview

Navigate through procedurally generated 3D mazes as a blue sphere, collecting yellow pellets while being hunted by colorful AI ghosts. Use power-ups strategically to survive and achieve the highest score possible!

## 🕹️ How to Play

### Objective
- Collect all yellow pellets in the maze to win
- Avoid getting caught by the AI ghosts
- Survive with your 3 lives and achieve the highest score

### Getting Started
1. Open `index.html` in your web browser
2. Adjust maze settings if desired (size, type, camera angle, brightness)
3. Click **"Start Game"** to begin your adventure
4. Use WASD keys to navigate through the maze

## 🎮 Controls

### Movement
- **W** - Move Forward (North)
- **A** - Move Left (West) 
- **S** - Move Backward (South)
- **D** - Move Right (East)

### Power-ups & Special Actions
- **SPACEBAR** - Activate Dash (speed boost for 3 seconds)
- **V** - Activate Overhead View (top-down perspective for 7 seconds)
- **Q** - Manual Respawn (after death - press to respawn with protection)
- **R** - Reset Camera Angle to default

### Game Controls
- **Start Game** - Begin a new game session
- **Reset Game** - End current game and return to menu
- **Regenerate Maze** - Create a new maze layout (only when not playing)

## 🌟 Game Features

### Dynamic Camera System
- **Angle Control**: Adjust viewing angle from 0° (top-down) to 90° (side view)
- **Automatic Angle Setting**: Each maze type has an optimized default camera angle
- **Brightness Control**: Adjust lighting from 0.1 to 3.0 for better visibility

### Maze Types
Choose from three distinct maze generation algorithms:

1. **Perfect Maze** 
   - Classic maze with one unique path between any two points
   - Optimal camera angle: 50°
   - Best for strategic gameplay

2. **Imperfect Maze**
   - Multiple paths with loops and shortcuts
   - Optimal camera angle: 50°
   - Allows for more tactical movement options

3. **Pac-Man Style Maze**
   - Open corridors with strategic barriers
   - Optimal camera angle: 65°
   - Fast-paced gameplay with clear sight lines

### Maze Sizes
- Adjustable from 5x5 to 25x25 grid
- Larger mazes = more challenge and longer gameplay
- Default: 10x10 for balanced experience

## 💫 Power-ups & Special Mechanics

### Dash System
- **Activation**: Press SPACEBAR
- **Effect**: 50% speed increase for 3 seconds
- **Cooldown**: 12 seconds
- **Strategy**: Use to escape from ghosts or quickly traverse open areas

### Overhead View
- **Activation**: Press V key
- **Effect**: Switch to top-down view for 7 seconds
- **Cooldown**: 20 seconds  
- **Strategy**: Get your bearings and plan optimal routes

### Power Pellets
- **Appearance**: Large golden spheres
- **Effect**: Activate "Power Mode" for 8 seconds
- **Power Mode Benefits**:
  - Ghosts turn blue and become vulnerable
  - Eat ghosts for bonus points (200, 400, 800, 1600...)
  - Ghosts respawn after 15 seconds

### Brightness Decay System
- Brightness automatically decreases if you don't collect pellets
- Starts after 3 seconds of no pellet collection
- Decreases by 0.2 every 3 seconds (minimum 0.1)
- Reset by collecting any pellet
- Creates urgency and prevents camping

## 👻 Ghost AI Behavior

### Ghost Types & Behaviors
- **Red Ghost (Chase)**: Uses advanced A* pathfinding to hunt you directly
- **Pink Ghost (Scatter)**: Uses heuristic movement with some unpredictability  
- **Cyan Ghost (Ambush)**: Employs BFS pathfinding for strategic positioning
- **Orange Ghost (Random)**: 70% player-seeking, 30% random movement

### Ghost States
- **Normal**: Full speed hunting behavior
- **Frightened**: Slower, blue color, vulnerable during Power Mode
- **Eaten**: Returning to spawn point at high speed
- **Respawning**: Temporarily inactive after being eaten

### Grace Period
- **Duration**: 1.5-2.7 seconds after game start
- **Effect**: Ghosts move slower and less aggressively
- **Purpose**: Gives you time to get oriented

## 🏆 Scoring System

### Points
- **Regular Pellet**: 10 points
- **Power Pellet**: 50 points
- **Ghost (during Power Mode)**: 
  - 1st ghost: 200 points
  - 2nd ghost: 400 points  
  - 3rd ghost: 800 points
  - 4th ghost: 1600 points

### Lives System
- Start with 3 lives
- Lose a life when caught by a ghost
- Game over when all lives are lost
- **Manual Respawn**: After death, press Q to respawn with 3 seconds of protection

## 🎯 Pro Tips & Strategies

### Movement Strategy
- **Learn the Layout**: Use Overhead View (V) to memorize maze structure
- **Corner Safety**: Ghosts have trouble with tight corners - use this to your advantage
- **Dash Timing**: Save Dash for emergency escapes, not general movement

### Power Pellet Strategy
- **Save for Crowds**: Use when multiple ghosts are nearby for maximum points
- **Chain Eating**: Try to eat multiple ghosts during one Power Mode
- **Safe Zones**: Know where you can retreat when Power Mode ends

### Advanced Techniques
- **Bait and Switch**: Lure ghosts into dead ends, then escape with Dash
- **Brightness Management**: Collect pellets regularly to maintain visibility
- **Camera Optimization**: Use the optimal angle for your chosen maze type

### Survival Tips
- **Respawn Protection**: After pressing Q to respawn, you have 3 seconds of safety
- **Ghost Patterns**: Learn individual ghost behaviors to predict their movements
- **Power-up Cycling**: Manage cooldowns - don't waste power-ups when others are available

## 🔧 Game Settings

### Pre-Game Configuration
- **Maze Type**: Choose your preferred algorithm
- **Maze Size**: Adjust difficulty with grid size
- **Camera Angle**: Set viewing perspective (auto-optimized per maze type)
- **Brightness**: Adjust lighting for comfort (auto-maximized after you start a game)

### In-Game HUD
- **Score**: Current points earned
- **Lives**: Remaining life count
- **Pellets**: Collected vs. Total
- **Power Pellets**: Collected vs. Total  
- **Active Ghosts**: Number of ghosts currently hunting
- **Power-up Status**: Cooldowns and active effects

## 🎪 Visual Effects

### Particle Systems
- **Pellet Collection**: Yellow sparkles
- **Power Pellet Collection**: Golden burst
- **Power Mode Activation**: Blue energy effect
- **Ghost Eaten**: Gray explosion
- **Player Hit**: Red impact effect

### Dynamic Lighting
- **Automatic Adjustment**: Lighting optimized for each maze type
- **Brightness Decay**: Visual feedback for pellet collection urgency
- **Power Mode**: Enhanced lighting during special states

## 🏁 Winning & Losing

### Victory Conditions
- Collect all pellets in the maze
- Achieve the highest score possible
- Survive with remaining lives for bonus satisfaction

### Game Over Conditions  
- All 3 lives lost to ghost encounters
- Must restart to try again

### Replay Value
- **Procedural Generation**: Every maze is unique
- **Multiple Strategies**: Different approaches for each maze type
- **Score Competition**: Challenge yourself to beat your high score
- **Mastery Curve**: Advanced techniques reward skilled players

---

**Ready to test your maze navigation skills? Start your adventure and see how long you can survive in the ever-changing 3D mazes!** 
