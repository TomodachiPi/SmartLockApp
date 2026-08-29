import { Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import MacroCard from './userCard';

export default function MacroGrid() {
  const [userList, setUserList] = useState([])

  return (
    <View style={styles.grid}>
        <Pressable>
            <MacroCard label='Administrator' time='Any time, Monday to Sunday' color='#ff6b6b'/>
        </Pressable>
        <Pressable>
            <MacroCard label='User' time='10:00 AM to 1:00 PM, Tuesday' color='#4ecdc4'/>
        </Pressable>
    </View>
  );
}



const styles = StyleSheet.create({
  grid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    gap: 12,
  },
});