import { useEffect, useState, type FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = ['#0069E4', '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF922B', '#CC5DE8'];
const PARTICLE_COUNT = 60;

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  shape: 'rect' | 'circle';
}

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -(Math.random() * 20 + 5),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 1,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }));
}

export const ConfettiEffect: FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(createParticles());
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: `${p.x}vw`,
              y: `${p.y}vh`,
              rotate: 0,
              scale: p.scale,
              opacity: 1,
            }}
            animate={{
              y: '110vh',
              rotate: p.rotation + 720,
              x: `${p.x + (Math.random() - 0.5) * 30}vw`,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 2.5 + Math.random() * 2,
              ease: 'easeIn',
              delay: Math.random() * 0.6,
            }}
            className="absolute"
          >
            <div
              className={p.shape === 'rect' ? 'w-3 h-2 rounded-sm' : 'w-3 h-3 rounded-full'}
              style={{ backgroundColor: p.color }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
