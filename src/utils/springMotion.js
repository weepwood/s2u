// 临界阻尼弹簧解析解；px 与 ms 为单位，重新定目标时继承速度。
export const SPRING_DURATION = 480
export function sampleSpring(from, to, velocity, elapsed) {
  const t = Math.max(0, elapsed), w = .025
  const displacement = from - to, b = velocity + w * displacement
  const decay = Math.exp(-w * t)
  return { value: to + (displacement + b * t) * decay, velocity: (velocity - w * b * t) * decay }
}
