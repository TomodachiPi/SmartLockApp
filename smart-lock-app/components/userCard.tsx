import { StyleSheet, Text, View, Pressable } from 'react-native';

type MacroCardProps = {
  label: string;
  time: string;
  color: string;
};

export default function MacroCard({
  label,
  time,
  color,
}: MacroCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Pressable>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.time}>{time}</Text>
      </Pressable>
      
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  label: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  time: {
    fontSize: 14,
    color: '#a0a0b0',
    marginTop: 2,
  },
});