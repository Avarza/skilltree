import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/** The app icon's circuit tree: traces ending in skill nodes. Simplified for small sizes (same 1024 grid / 10). */
export function LogoMark({
  size = 32,
  color = '#04161C',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="18 16 66 78">
      <Path
        d="M51.2 90V27M51.2 72L40.4 61.2H31.6L25.2 54.8V42M51.2 62L43.2 54V33M43.2 47L35.2 39V30M51.2 68L62 57.2H70.8L77.2 50.8V40M51.2 56L59.2 48V30M59.2 40L67.2 32V25"
        stroke={color}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={51.2} cy={22.8} r={4.6} fill={color} />
      <Circle cx={43.2} cy={29.6} r={3.8} fill={color} />
      <Circle cx={35.2} cy={27} r={3.6} fill={color} />
      <Circle cx={25.2} cy={39.2} r={3.8} fill={color} />
      <Circle cx={59.2} cy={26.6} r={3.8} fill={color} />
      <Circle cx={67.2} cy={22.2} r={3.6} fill={color} />
      <Circle cx={77.2} cy={37.2} r={3.8} fill={color} />
    </Svg>
  );
}
