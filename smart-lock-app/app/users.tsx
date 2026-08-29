import { globalStyles } from '@/styles/global';
import { Text, ScrollView, Image, View, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import NavBar from "@/components/navbar"
import MacroCard from '@/components/userCard';

export default function UsersScreen() {
    const router = useRouter();

    const [username, setUsername] = useState("Administrator")

    const moveToLock = () => {router.replace("/lock")}

    const moveToHistory = () => {router.replace("/history")}

    const moveToUsers = () => {}

    const handleLogout = () => {
        router.replace({
            pathname: "/",
        })
    }

    return (
        <View style={globalStyles.container}>
            <ScrollView>
                <View style={globalStyles.headerContainer}>        
                    <View style={globalStyles.rightAlign}>
                        <Pressable onPress={handleLogout} style={globalStyles.buttonTertiary}>
                            <View style={globalStyles.buttonIconContainer}>
                                <Text style={globalStyles.buttonIconSmallText}>Log out</Text>
                            </View>
                        </Pressable>
                    </View>
                   
                </View>

                <View style={globalStyles.userCardContainer}>
                    <Image style={globalStyles.userImage} source={require('../assets/images/user.png')}/>
                    <View style={globalStyles.userCardSubcontainer}>
                        <Text style={globalStyles.nameTitle}>{username}</Text>
                        <Text style={globalStyles.intertitle}>Admin</Text>
                    </View>
                </View>

                <Text style={globalStyles.leftSectionTitle}>Pending User Account Approval</Text>
                <Text style={globalStyles.leftSectionTitle}>Manage Users</Text>

                <MacroCard label='User' time='10:00 AM to 1:00 PM, Tuesday' color='#4ecdc4'/>
            </ScrollView>
            <NavBar moveToLock={moveToLock} moveToHistory={moveToHistory} moveToUsers={moveToUsers} />
        </View>
    );
}