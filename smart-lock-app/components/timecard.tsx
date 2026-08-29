import { StyleSheet, Image, Text, View, Pressable } from 'react-native';
import { globalStyles } from "@/styles/global";

interface functionArgs {
    username: string,
    permission: string,
    locked: boolean,
    startingTime: string,
    endingTime: string,
    date: string,
}

export default function TimeCard({username, permission, locked, startingTime, endingTime, date}: functionArgs) {
    return (
        <View style={styles.timecardContainer}>
            <View>
                <View style={styles.timecardRow}>
                    <Image style={styles.timecardImage} source={require('../assets/images/user.png')}/>
                    <Text style={styles.timecardText}>{username}</Text>
                </View>
                <View style={styles.timecardRow}>
                    <Image style={styles.timecardImage} source={require('../assets/images/key.png')}/>
                    <Text style={styles.timecardText}>{permission}</Text>
                </View>
                <View style={styles.timecardRow}>
                    {locked ?
                        <Image style={styles.timecardImage} source={require('../assets/images/locked.png')}/>:
                        <Image style={styles.timecardImage} source={require('../assets/images/unlocked.png')}/>
                    }
                    {locked ?
                        <Text style={styles.timecardText}>Locked</Text>:
                        <Text style={styles.timecardText}>Unlocked</Text>
                    }
                </View>
                <View style={styles.timecardRow}>
                    <Image style={styles.timecardImage} source={require('../assets/images/time.png')}/>
                    <Text style={styles.timecardText}>{startingTime}   to   {endingTime}</Text>
                </View>
                <View style={styles.timecardRow}>
                    <Image style={styles.timecardImage} source={require('../assets/images/calendar.png')}/>
                    <Text style={styles.timecardDateText}>{date}</Text>
                </View>
            </View>
            
        </View>
    );
}

const styles = StyleSheet.create({
    timecardContainer: {
        backgroundColor: '#16213e',
        borderRadius: 12,
        padding: 16,
    },
    timecardRow: {
        display: 'flex',
        flexDirection: 'row',
        marginTop: 5,
        marginBottom: 5,
    },
    timecardImage: {
        width: 24,
        height: 24,
        marginLeft: 10,
        marginRight: 10,
    },
    timecardText: {
        fontSize: 20,
        color: "#ffffff",
    },
    timecardDateText: {
        fontSize: 20,
        fontWeight: '800',
        color: "#ffffff",
    },
});