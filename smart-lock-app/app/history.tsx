import { globalStyles } from '@/styles/global';
import { Text, ScrollView, Image, View, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import NavBar from "@/components/navbar"
import TimeCard from "@/components/timecard"

export interface history {
    'username': string,
    'permission': string,
    'locked': boolean;
    'startingTime': string;
    'endingTime': string;
    'date': string;
}

const histories: history[] = []


export default function HistoryScreen() {
    const router = useRouter();

    const [historyRecord, setHistoryRecord] = useState(histories);

    (async () => {
        
        //const locked_status = await getData("locked") === "true";
        //setLocked(locked_status)
    })();

    useEffect(() => {
        const update_timer = setInterval(async () => {
            console.log("update stuff")
            const history_data = await getData("history_record")
            if(history_data != null){
                setHistoryRecord(JSON.parse(history_data as string) as history[])
            }
            

            console.log(history_data as string)
        }, 100);

        return () => {
            clearInterval(update_timer);
        }
    }, []);

    const moveToLock = () => {router.replace("/lock")}

    const moveToHistory = () => {}

    const moveToUsers = () => {router.replace("/users")}

    const handleDeleteHistory = async () => {
        await setData("history_record", [])
    }

    return (
        <View style={globalStyles.container}>
            <ScrollView>
                <Text style={globalStyles.leftSectionTitle}>Data Statistics</Text>

                <Text style={globalStyles.leftSectionTitle}>Recent Opens/Closes</Text>
                <View style={globalStyles.timecardContainer}>
                    {/*<TimeCard locked={false} startingTime={"1:35 PM"} endingTime={"8:47 PM"} date={"July 7, 2026"}/>*/}
                    {[...historyRecord].reverse().map((item: history, index: number) => (
                        <TimeCard key={index}
                            username={item.username}
                            permission={item.permission}
                            locked={item.locked} 
                            startingTime={item.startingTime} 
                            endingTime={item.endingTime} 
                            date={item.date}
                        />
                    ))
                    }
                </View>
                <Pressable onPress={handleDeleteHistory} style={globalStyles.buttonTertiary}>
                    <View style={globalStyles.buttonIconContainer}>
                        <Image style={globalStyles.buttonImage} source={require('../assets/images/trash.png')}/>
                        <Text style={globalStyles.buttonIconText}>Delete all recent</Text>
                    </View>
                </Pressable>
                    

                <View style={globalStyles.expander}></View>
            </ScrollView>
            <NavBar moveToLock={moveToLock} moveToHistory={moveToHistory} moveToUsers={moveToUsers} />
        </View>
    );
}

const setData = async (key: string, value: any): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (e) {
      console.error(`Error setting storage key:`, e);
    }
  };
  
const getData = async (key: string): Promise<string | void | null> => {
try {
    const value = await AsyncStorage.getItem(key);
    if(value === null){return null}
    else {return value}
} catch (e) {
    console.error(`Error setting storage key:`, e);
}
};