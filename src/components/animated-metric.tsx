import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";

interface AnimatedMetricValueProps {
  value: number;
  suffix?: string;
}

export function AnimatedMetricValue({ value, suffix = "" }: AnimatedMetricValueProps) {
  const reducedMotion = useReducedMotion();
  const spring = useSpring(reducedMotion ? value : 0, {
    stiffness: 180,
    damping: 24,
    mass: 0.7,
  });
  const rounded = useTransform(spring, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    if (reducedMotion) {
      spring.jump(value);
      return;
    }

    spring.set(value);
  }, [reducedMotion, spring, value]);

  return (
    <motion.span
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="inline-block"
    >
      {rounded}
      {suffix}
    </motion.span>
  );
}

interface AnimatedMetricPairProps {
  first: number;
  second: number;
}

export function AnimatedMetricPair({ first, second }: AnimatedMetricPairProps) {
  const reducedMotion = useReducedMotion();

  return (
    <span className="inline-flex items-center">
      <AnimatedMetricValue value={first} />
      <span className="mx-1">/</span>
      <AnimatedMetricValue value={second} />
      {reducedMotion ? null : (
        <motion.span
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.16, duration: 0.2 }}
        />
      )}
    </span>
  );
}
