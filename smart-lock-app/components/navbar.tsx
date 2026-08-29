import { StyleSheet, Image, Text, View, Pressable } from 'react-native';
import { globalStyles } from "@/styles/global";

interface functionArgs {
    moveToLock: () => void,
    moveToHistory: () => void,
    moveToUsers: () => void,
}

export default function NavBar({ moveToLock, moveToHistory, moveToUsers }: functionArgs) {
    return (
        <View style={styles.stickyBottom}>
            <Pressable onPress={moveToLock} style={styles.navbarButton}>
                <View style={styles.navbarContainer}>
                    <Image style={styles.navbarImage} source={require('../assets/images/locked.png')}/>
                    <Text style={globalStyles.buttonNavbarText}>Lock</Text>
                </View>   
            </Pressable>
            <Pressable onPress={moveToHistory} style={styles.navbarButton}>
                <View style={styles.navbarContainer}>
                    <Image style={styles.navbarImage} source={require('../assets/images/history.png')}/>
                    <Text style={globalStyles.buttonNavbarText}>History</Text>
                </View>
            </Pressable>
            <Pressable onPress={moveToUsers} style={styles.navbarButton}>
                <View style={styles.navbarContainer}>
                    <Image style={styles.navbarImage} source={require('../assets/images/user.png')}/>
                    <Text style={globalStyles.buttonNavbarText}>Users</Text>
                </View>
            </Pressable>
            
        </View>
    );
}

const styles = StyleSheet.create({
    navbarContainer: {
        display: 'flex',
        alignItems: 'center',
    },
    navbarImage: {
        width: 50,
        height: 50,
    },
    navbarButton: {
        flexGrow: 1,
    },
    whiteText: {
        color: "#ffffff",
    },
    stickyBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1a1a2e',
        padding: 20,
        paddingBottom: 40,
        display: "flex",
        flexDirection: "row",
        flex: 1,
    },
});