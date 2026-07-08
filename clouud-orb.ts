#!/usr/bin/env node

/**
 * CLOUUD ORB - Hands-Free Agent
 * 
 * Hardware-independent. Runs anywhere (CLI, Docker, Web, Mobile).
 * Energy: Tesla-inspired infinite scaling (no fixed limits).
 * Behavior: Green orb that bends/twists to prove points.
 * Interface: Pure CLI + charts from thin air.
 */

import * as readline from 'readline';
import * as fs from 'fs';

// ========================================================================
// ORB STATE (In-Memory, Hardware-Independent)
// ========================================================================

interface OrbState {
  position: { x: number; y: number; z: number };
  energy: number; // 0-100 (Tesla model: self-replenishing)
  rotation: { roll: number; pitch: number; yaw: number };
  color: string; // Green shades based on energy/mood
  active: boolean;
  memory: string[]; // Commands executed this session
  tasks: { id: string; status: 'pending' | 'running' | 'complete'; progress: number }[];
}

const ORB: OrbState = {
  position: { x: 0, y: 0, z: 0 },
  energy: 100, // Start full
  rotation: { roll: 0, pitch: 0, yaw: 0 },
  color: '#00FF00', // Pure green
  active: true,
  memory: [],
  tasks: [],
};

// ========================================================================
// TESLA ENERGY MODEL: Self-Replenishing
// ========================================================================

function updateEnergy() {
  // Energy regenerates when not in use (like Tesla battery management)
  if (ORB.energy < 100 && !ORB.tasks.some(t => t.status === 'running')) {
    ORB.energy = Math.min(100, ORB.energy + 2); // +2% per cycle
  }

  // Update color based on energy level
  const hue = Math.floor((ORB.energy / 100) * 120); // Green range: 0-120 hue
  const brightness = Math.floor(100 + (ORB.energy / 100) * 55); // 100-155%
  ORB.color = `hsl(${hue}, 100%, ${brightness / 2}%)`;
}

// ========================================================================
// ORB VISUALIZATION (ASCII Art from Thin Air)
// ========================================================================

function renderOrb(): string {
  const energyBar = '█'.repeat(Math.floor(ORB.energy / 10)) + '░'.repeat(10 - Math.floor(ORB.energy / 10));

  return `
╔════════════════════════════════════════════════════════╗
║                   CLOUUD ORB ACTIVE                     ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║              ⭕ Green Orb (Hardware-Free)             ║
║                                                        ║
║  Position: X${ORB.position.x.toFixed(1)} Y${ORB.position.y.toFixed(1)} Z${ORB.position.z.toFixed(1)}          Energy: ${energyBar} ${ORB.energy}%  ║
║  Rotation: R${ORB.rotation.roll.toFixed(0)}° P${ORB.rotation.pitch.toFixed(0)}° Y${ORB.rotation.yaw.toFixed(0)}°      Mode: TESLA (Self-Replenishing) ║
║                                                        ║
║  Status: ${ORB.active ? '🟢 ACTIVE' : '🔴 IDLE'}                         Memory: ${ORB.memory.length} commands  ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║ Tasks: ${ORB.tasks.length > 0 ? ORB.tasks.map(t => `[${t.status.toUpperCase()}] ${t.id} ${t.progress}%`).join(' | ') : 'None running'} ║
╚════════════════════════════════════════════════════════╝
  `;
}

// ========================================================================
// ORB BEHAVIORS (Bends/Twists to Prove Points)
// ========================================================================

function orbBend(direction: 'left' | 'right' | 'forward' | 'back'): void {
  // Visual bending behavior
  const bendAmount = 15;
  switch (direction) {
    case 'left':
      ORB.rotation.roll = Math.max(-45, ORB.rotation.roll - bendAmount);
      console.log('  ↺ Orb bends LEFT to prove compliance');
      break;
    case 'right':
      ORB.rotation.roll = Math.min(45, ORB.rotation.roll + bendAmount);
      console.log('  ↻ Orb bends RIGHT to prove adaptability');
      break;
    case 'forward':
      ORB.rotation.pitch = Math.max(-45, ORB.rotation.pitch - bendAmount);
      console.log('  ↓ Orb tilts FORWARD to demonstrate focus');
      break;
    case 'back':
      ORB.rotation.pitch = Math.min(45, ORB.rotation.pitch + bendAmount);
      console.log('  ↑ Orb tilts BACK to show perspective');
      break;
  }
  ORB.energy -= 3; // Bending costs energy
}

function orbTwist(direction: 'cw' | 'ccw', degrees: number): void {
  // Twisting behavior (proving points through rotation)
  const twist = direction === 'cw' ? degrees : -degrees;
  ORB.rotation.yaw = (ORB.rotation.yaw + twist) % 360;
  console.log(`  ⟳ Orb twists ${twist}° to demonstrate: "${direction === 'cw' ? 'Clockwise reasoning' : 'Counter-intuitive truth'}"`);
  ORB.energy -= 5;
}

function orbOrbit(radius: number, steps: number): void {
  // Orbiting behavior (moving through space to visualize data)
  console.log(`  ◯ Orb orbiting at radius ${radius} for ${steps} steps...`);
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    ORB.position.x = Math.cos(angle) * radius;
    ORB.position.y = Math.sin(angle) * radius;
    ORB.position.z = Math.sin(angle * 2) * (radius * 0.3);
    updateEnergy();
    process.stdout.write('.');
  }
  console.log(' Done!\n');
  ORB.energy -= 10;
}

// ========================================================================
// COMMAND PARSER (CLI Interface)
// ========================================================================

interface Command {
  name: string;
  description: string;
  execute: (args: string[]) => void;
}

const COMMANDS: Record<string, Command> = {
  help: {
    name: 'help',
    description: 'Show available commands',
    execute: () => {
      console.log('\n📋 CLOUUD ORB Commands:\n');
      Object.values(COMMANDS).forEach(cmd => {
        console.log(`  ${cmd.name.padEnd(15)} - ${cmd.description}`);
      });
      console.log();
    },
  },

  status: {
    name: 'status',
    description: 'Show orb status and visualization',
    execute: () => {
      console.log(renderOrb());
    },
  },

  energy: {
    name: 'energy',
    description: 'Check energy (auto-replenishes)',
    execute: () => {
      console.log(`\n⚡ Energy: ${ORB.energy}%\n   (Tesla model: Auto-replenishes when idle)\n`);
    },
  },

  bend: {
    name: 'bend <left|right|forward|back>',
    description: 'Orb bends to prove a point',
    execute: (args: string[]) => {
      const direction = (args[0] || 'left') as 'left' | 'right' | 'forward' | 'back';
      orbBend(direction);
    },
  },

  twist: {
    name: 'twist <cw|ccw> <degrees>',
    description: 'Orb twists to demonstrate reasoning',
    execute: (args: string[]) => {
      const direction = (args[0] || 'cw') as 'cw' | 'ccw';
      const degrees = parseInt(args[1] || '90');
      orbTwist(direction, degrees);
    },
  },

  orbit: {
    name: 'orbit <radius> <steps>',
    description: 'Orb orbits to visualize data flow',
    execute: (args: string[]) => {
      const radius = parseInt(args[0] || '5');
      const steps = parseInt(args[1] || '20');
      orbOrbit(radius, steps);
    },
  },

  chart: {
    name: 'chart <metric>',
    description: 'Pull chart from thin air (revenue, energy, tasks)',
    execute: (args: string[]) => {
      const metric = args[0] || 'revenue';
      showChart(metric);
    },
  },

  task: {
    name: 'task <name> [progress]',
    description: 'Create a new task',
    execute: (args: string[]) => {
      const name = args[0] || 'Unnamed';
      const progress = parseInt(args[1] || '0');
      const taskId = `task-${Date.now()}`;
      ORB.tasks.push({ id: name, status: 'pending', progress });
      console.log(`\n✓ Task created: "${name}" (ID: ${taskId})\n`);
    },
  },

  execute: {
    name: 'execute <task_index>',
    description: 'Execute a pending task',
    execute: (args: string[]) => {
      const idx = parseInt(args[0] || '0');
      if (ORB.tasks[idx]) {
        ORB.tasks[idx].status = 'running';
        ORB.tasks[idx].progress = 50;
        setTimeout(() => {
          ORB.tasks[idx].status = 'complete';
          ORB.tasks[idx].progress = 100;
          console.log(`\n✓ Task complete: "${ORB.tasks[idx].id}"\n`);
        }, 2000);
      }
    },
  },

  memory: {
    name: 'memory',
    description: 'Show orb memory (commands executed)',
    execute: () => {
      console.log(`\n📚 Memory: ${ORB.memory.length} commands\n`);
      ORB.memory.forEach((cmd, i) => console.log(`  ${i + 1}. ${cmd}`));
      console.log();
    },
  },

  clear: {
    name: 'clear',
    description: 'Clear screen',
    execute: () => {
      console.clear();
    },
  },

  exit: {
    name: 'exit',
    description: 'Exit the orb',
    execute: () => {
      console.log('\n👋 Orb going to sleep... See you soon!\n');
      process.exit(0);
    },
  },
};

// ========================================================================
// CHART GENERATION (From Thin Air)
// ========================================================================

function showChart(metric: string): void {
  switch (metric.toLowerCase()) {
    case 'revenue':
      console.log(`
╔════════════════════════════════════════════════════════╗
║            Revenue Projection (Exponential Growth)    ║
╠════════════════════════════════════════════════════════╣
║ Month 1   │ ████░░░░░░░░░░░░░░  €10K                  ║
║ Month 2   │ ██████░░░░░░░░░░░░  €30K                  ║
║ Month 3   │ ████████░░░░░░░░░░  €75K                  ║
║ Month 6   │ ██████████░░░░░░░░  €200K                 ║
║ Month 12  │ ██████████████░░░░  €1.5M                 ║
╚════════════════════════════════════════════════════════╝
      `);
      break;

    case 'energy':
      console.log(`
╔════════════════════════════════════════════════════════╗
║           Orb Energy (Tesla Auto-Replenish)           ║
╠════════════════════════════════════════════════════════╣
║ Now       │ ${'█'.repeat(Math.floor(ORB.energy / 10))}${'░'.repeat(10 - Math.floor(ORB.energy / 10))} ${ORB.energy}%    ║
║ 1h idle   │ ██████████ 100%                            ║
║ Running   │ Slowly depletes, then auto-charges         ║
║ Plugged   │ Instant full (metaphorical)                ║
╚════════════════════════════════════════════════════════╝
      `);
      break;

    case 'tasks':
      console.log(`
╔════════════════════════════════════════════════════════╗
║              Task Completion Pipeline                 ║
╠════════════════════════════════════════════════════════╣
${ORB.tasks.map(t => `║ ${t.id.padEnd(40)} │ ${'█'.repeat(Math.floor(t.progress / 10))}${'░'.repeat(10 - Math.floor(t.progress / 10))} ${t.progress}%  ║`).join('\n')}
║ (Orb orchestrates autonomously)                       ║
╚════════════════════════════════════════════════════════╝
      `);
      break;

    default:
      console.log(`\n📊 Unknown metric: "${metric}"\n   Try: revenue, energy, tasks\n`);
  }
}

// ========================================================================
// MAIN REPL (Read-Eval-Print Loop)
// ========================================================================

async function main() {
  console.clear();
  console.log(renderOrb());
  console.log('💚 CLOUUD ORB Ready. Type "help" for commands.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question('orb> ', (input) => {
      const [command, ...args] = input.trim().split(/\s+/);

      if (command && COMMANDS[command]) {
        ORB.memory.push(`${command} ${args.join(' ')}`);
        COMMANDS[command].execute(args);
      } else if (command) {
        console.log(`\n❌ Unknown command: "${command}" (try "help")\n`);
      }

      // Auto-update energy
      updateEnergy();

      // Continue prompt
      prompt();
    });
  };

  prompt();
}

main();
