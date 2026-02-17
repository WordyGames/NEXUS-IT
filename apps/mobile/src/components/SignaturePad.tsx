import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  PanResponderInstance,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type SignaturePoint = {
  x: number;
  y: number;
};

export interface SignatureData {
  svg: string;
  width: number;
  height: number;
  pointCount: number;
}

interface SignaturePadProps {
  height?: number;
  disabled?: boolean;
  onChange: (value: SignatureData | null) => void;
}

const MIN_POINT_DISTANCE = 1.8;

const distance = (a: SignaturePoint, b: SignaturePoint): number => (
  Math.hypot(a.x - b.x, a.y - b.y)
);

const clamp = (value: number, min: number, max: number): number => (
  Math.max(min, Math.min(max, value))
);

const buildSvgFromStrokes = (
  strokes: SignaturePoint[][],
  width: number,
  height: number
): SignatureData | null => {
  if (!width || !height) return null;

  const pathParts: string[] = [];
  let pointCount = 0;

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    pointCount += stroke.length;
    const [first, ...rest] = stroke;
    let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
    for (const point of rest) {
      path += ` L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }
    pathParts.push(path);
  }

  if (pointCount === 0) return null;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <path d="${pathParts.join(' ')}" fill="none" stroke="#111827" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`.trim();

  return {
    svg,
    width,
    height,
    pointCount
  };
};

export const SignaturePad = ({ height = 170, disabled = false, onChange }: SignaturePadProps) => {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height });
  const [strokes, setStrokes] = useState<SignaturePoint[][]>([]);
  const isDrawingRef = useRef(false);

  const clear = () => {
    setStrokes([]);
    onChange(null);
  };

  const addStroke = (point: SignaturePoint) => {
    setStrokes((prev) => [...prev, [point]]);
  };

  const addPointToCurrentStroke = (point: SignaturePoint) => {
    setStrokes((prev) => {
      if (prev.length === 0) {
        return [[point]];
      }

      const next = [...prev];
      const lastStroke = [...next[next.length - 1]];
      const lastPoint = lastStroke[lastStroke.length - 1];

      if (!lastPoint || distance(lastPoint, point) >= MIN_POINT_DISTANCE) {
        lastStroke.push(point);
        next[next.length - 1] = lastStroke;
      }

      return next;
    });
  };

  const panResponder: PanResponderInstance = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (event) => {
      if (disabled) return;
      isDrawingRef.current = true;
      const point = {
        x: clamp(event.nativeEvent.locationX, 0, canvasSize.width),
        y: clamp(event.nativeEvent.locationY, 0, canvasSize.height)
      };
      addStroke(point);
    },
    onPanResponderMove: (event) => {
      if (disabled || !isDrawingRef.current) return;
      const point = {
        x: clamp(event.nativeEvent.locationX, 0, canvasSize.width),
        y: clamp(event.nativeEvent.locationY, 0, canvasSize.height)
      };
      addPointToCurrentStroke(point);
    },
    onPanResponderRelease: () => {
      isDrawingRef.current = false;
    },
    onPanResponderTerminate: () => {
      isDrawingRef.current = false;
    }
  }), [canvasSize.height, canvasSize.width, disabled]);

  useEffect(() => {
    const signatureData = buildSvgFromStrokes(strokes, canvasSize.width, canvasSize.height);
    onChange(signatureData);
  }, [canvasSize.height, canvasSize.width, onChange, strokes]);

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.canvas, { height }, disabled && styles.canvasDisabled]}
        onLayout={(event) => {
          const { width: measuredWidth, height: measuredHeight } = event.nativeEvent.layout;
          setCanvasSize({
            width: measuredWidth,
            height: measuredHeight
          });
        }}
        {...panResponder.panHandlers}
      >
        {strokes.length === 0 && (
          <Text style={styles.placeholder}>
            Firma aqui con el dedo
          </Text>
        )}

        {strokes.map((stroke, strokeIndex) => (
          <View key={`stroke-${strokeIndex}`}>
            {stroke.map((point, pointIndex) => (
              <View
                key={`point-${strokeIndex}-${pointIndex}`}
                style={[
                  styles.point,
                  {
                    left: point.x - 1.5,
                    top: point.y - 1.5
                  }
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={clear} style={styles.clearButton} disabled={disabled}>
        <Text style={styles.clearButtonText}>Limpiar firma</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 8
  },
  canvas: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    position: 'relative'
  },
  canvasDisabled: {
    opacity: 0.65
  },
  placeholder: {
    position: 'absolute',
    top: '44%',
    alignSelf: 'center',
    color: '#9ca3af',
    fontSize: 13
  },
  point: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#111827'
  },
  clearButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#eff6ff'
  },
  clearButtonText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700'
  }
});
