import { globalStyles } from '@/styles/global';
import { ImageBackground, Text, ScrollView, Image, View, Pressable, ViewComponent } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from "@/components/navbar"
import AccessCard from "@/components/accesscard"

export interface history {
    'locked': boolean;
    'startingTime': string;
    'endingTime': string;
    'date': string;
}

export default function LockScreen() {
    const router = useRouter();

    const data = useLocalSearchParams();
    //console.log(data.username)
    
    const [greeting, setGreeting] = useState("Good Morning,")
    const [username, setUsername] = useState(data.username || "Administrator")
    const [permission, setPermission] = useState("Admin Privilege")

    const [doorName, setDoorName] = useState("Lab Door No. 1")
    const [locked, setLocked] = useState(false);
    const [changing, setChanging] = useState(false);
    const [canOpen, setCanOpen] = useState(false);
    
    const [time, setTime] = useState(new Date().toLocaleTimeString());

    (async () => {
        const locked_status = await getData("locked") === "true";
        setLocked(locked_status)
    })();

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const hours = now.getHours();
            setTime(now.toLocaleTimeString());

            if(hours <= 12){
                setGreeting("Good Morning,")
            } else if((hours > 12) && (hours <= 18)){
                setGreeting("Good Afternoon,")
            } else if(hours > 18){
                setGreeting("Good Evening,")
            } 
        }, 1000);
        
        const checking_access = setInterval(() => {
            console.log("checking locked and access test...")
            //console.log(username)
        }, 10000);

        return () => {
            clearInterval(timer);
            clearInterval(checking_access);
        }
    }, []);

    const handleLocking = () => {
        //console.log("lock button being tested")
        if(changing == false){
            setChanging(true)

            const changing_lock = setTimeout(async () => {
                await setData("locked", !locked)
                
                console.log("set data")
                const histories = await getData("history_record")
                if(histories != null){
                    const history_data = JSON.parse(histories as string) as history[]
                    
                    if(history_data.length != 0){
                        const previous_time = history_data[history_data.length - 1].endingTime

                        const now = new Date()
                        const hours = now.getHours()
                        const minutes = now.getMinutes()
                        var current_time = ""
                        if(hours < 12){
                            current_time = `${hours}:${String(minutes).padStart(2, "0")} AM`
                        } else if(hours == 12){
                            current_time = `12:${String(minutes).padStart(2, "0")} PM`
                        } else if(hours > 12){
                            current_time = `${hours - 12}:${String(minutes).padStart(2, "0")} AM`
                        }

                        const month_num = now.getMonth()
                        console.log(month_num)
                        var month = ""
                        switch(month_num){
                            case 0: month = "January"; break;
                            case 1: month = "February"; break;
                            case 2: month = "March"; break;
                            case 3: month = "April"; break;
                            case 4: month = "May"; break;
                            case 5: month = "June"; break;
                            case 6: month = "July"; break;
                            case 7: month = "August"; break;
                            case 8: month = "September"; break;
                            case 9: month = "October"; break;
                            case 10: month = "November"; break;
                            case 11: month = "December"; break;
                        }
                        const day = now.getDate()
                        const year = now.getFullYear()
                        const current_date = `${month} ${day}, ${year}`
                        await setData("history_record", [...history_data, {
                            'username': username,
                            'permission': permission,
                            'locked': locked,
                            'startingTime': previous_time,
                            'endingTime': current_time,
                            'date': current_date,
                        }])
                    } else {
                        const now = new Date()
                        const hours = now.getHours()
                        const minutes = now.getMinutes()
                        var current_time = ""
                        if(hours < 12){
                            current_time = `${hours}:${String(minutes).padStart(2, "0")} AM`
                        } else if(hours == 12){
                            current_time = `12:${String(minutes).padStart(2, "0")} PM`
                        } else if(hours > 12){
                            current_time = `${hours - 12}:${String(minutes).padStart(2, "0")} AM`
                        }

                        const month_num = now.getMonth()
                        var month = ""
                        switch(month_num){
                            case 0: month = "January"; break;
                            case 1: month = "February"; break;
                            case 2: month = "March"; break;
                            case 3: month = "April"; break;
                            case 4: month = "May"; break;
                            case 5: month = "June"; break;
                            case 6: month = "July"; break;
                            case 7: month = "August"; break;
                            case 8: month = "September"; break;
                            case 9: month = "October"; break;
                            case 10: month = "November"; break;
                            case 11: month = "December"; break;
                        }
                        const day = now.getDate()
                        const year = now.getFullYear()
                        const current_date = `${month} ${day}, ${year}`

                        await setData("history_record", [{
                            'username': username,
                            'permission': permission,
                            'locked': locked,
                            'startingTime': "12:00 AM",
                            'endingTime': current_time,
                            'date': current_date,
                        }])
                    }
                } else {
                    const now = new Date()
                    const hours = now.getHours()
                    const minutes = now.getMinutes()
                    var current_time = ""
                    if(hours < 12){
                        current_time = `${hours}:${String(minutes).padStart(2, "0")} AM`
                    } else if(hours == 12){
                        current_time = `12:${String(minutes).padStart(2, "0")} PM`
                    } else if(hours > 12){
                        current_time = `${hours - 12}:${String(minutes).padStart(2, "0")} AM`
                    }

                    const month_num = now.getMonth()
                    var month = ""
                    switch(month_num){
                        case 0: month = "January"; break;
                        case 1: month = "February"; break;
                        case 2: month = "March"; break;
                        case 3: month = "April"; break;
                        case 4: month = "May"; break;
                        case 5: month = "June"; break;
                        case 6: month = "July"; break;
                        case 7: month = "August"; break;
                        case 8: month = "September"; break;
                        case 9: month = "October"; break;
                        case 10: month = "November"; break;
                        case 11: month = "December"; break;
                    }
                    const day = now.getDate()
                    const year = now.getFullYear()
                    const current_date = `${month} ${day}, ${year}`

                    await setData("history_record", [{
                        'username': username,
                        'permission': permission,
                        'locked': locked,
                        'startingTime': "12:00 AM",
                        'endingTime': current_time,
                        'date': current_date,
                    }])
                }

                setLocked(!locked)
                setChanging(false)
            }, 3000);
        }
    }

    const moveToLock = () => {}

    const moveToHistory = () => {router.replace({
        pathname: "/history",
        params: {"username": username}
    })}

    const moveToUsers = () => {router.replace("/users")}

    return (
        <View style={globalStyles.container}>
            <ScrollView>
                <View>
                    <View style={globalStyles.headerContainer}>
                        <View>
                            <Text style={globalStyles.subtitle}>{greeting}</Text>
                            <Text style={globalStyles.subtitle}>{username || "testing_username"}</Text>
                        </View>
                        <View style={globalStyles.rightAlign}>
                            <Text style={globalStyles.subtitle}>It is currently</Text>
                            <Text style={globalStyles.timeTitle}>{time}</Text>
                        </View>
                    </View>

                    <ImageBackground source={require('../assets/images/door.png')}>
                        <LinearGradient
                            // Starts completely clear and ends fully opaque matching the background
                            colors={['rgba(26, 26, 46, 1)', 'rgba(26, 26, 46, 0)']}
                            // Top to bottom direction orientation
                            start={{ x: 0.6, y: 1 }}
                            end={{ x: 0.05, y: 1 }}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: 0,
                                height: '100%',
                            }}
                        />

                        <View style={globalStyles.lockContainer}>
                            <View style={{width: '30%',}}></View>
                            <View style={globalStyles.centerContainer}>
                                <Text style={globalStyles.nameTitle}>{doorName}</Text>
                                <Text style={globalStyles.intertitle}>is currently</Text>

                                <View style={globalStyles.lockSubContainer}>
                                    <Pressable onPress={handleLocking}>
                                        {changing ?
                                        <View>
                                        {locked ? 
                                        <View style={globalStyles.centerContainer}>
                                            <Image style={globalStyles.frontImage} source={require('../assets/images/locked.png')}/>
                                            <Text style={globalStyles.subtitle}>UNLOCKING...</Text>
                                        </View>:
                                        <View style={globalStyles.centerContainer}>
                                            <Image style={globalStyles.frontImage} source={require('../assets/images/unlocked.png')}/>
                                            <Text style={globalStyles.subtitleCentered}>LOCKING...</Text>
                                        </View>
                                        }
                                        </View>:
                                        <View>
                                        {locked ? 
                                        <View style={globalStyles.centerContainer}>
                                            <Image style={globalStyles.frontImage} source={require('../assets/images/locked.png')}/>
                                            <Text style={globalStyles.subtitle}>LOCKED</Text>
                                        </View>:
                                        <View style={globalStyles.centerContainer}>
                                            <Image style={globalStyles.frontImage} source={require('../assets/images/unlocked.png')}/>
                                            <Text style={globalStyles.subtitleCentered}>UNLOCKED</Text>
                                        </View>
                                        }
                                        </View>
                                        }
                                    </Pressable>
                                </View>

                                <Text style={globalStyles.subtitle}>You can {locked ? "open" : "close"} the lock</Text>
                            </View>
                        </View>
                    </ImageBackground>
                    
                    <View>
                        <Text style={globalStyles.leftSectionTitle}>Allowed Access Periods</Text>
                        
                        <AccessCard permission={"Admin Privilege"} startingTime={"12:00 AM"} endingTime={"11:59 PM"} date={"Monday to Sunday"}/>
                    </View>

                    <View style={globalStyles.expander}></View>
                </View>
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
  