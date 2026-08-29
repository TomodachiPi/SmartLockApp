import { ScrollView, Image, Platform, Text, View, Button, Pressable, TextInput, StyleSheet } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles } from "@/styles/global";
import { useState, useEffect } from "react";
import { useRouter } from 'expo-router';
import MacroGrid from "@/components/userGrid";

export interface profile {
  'username': string;
  'password': string;
  'type': 'admin' | 'user';
  'time': Array<number>;
}

const profiles: profile[] = [
  {
    'username': "Administrator",
    'password': "admin123",
    'type': 'admin',
    'time': [0, 1440]
  },
  {
    'username': "User123test",
    'password': "user",
    'type': 'admin',
    'time': [0, 1, 2, 3]
  }
]

export default function Index() {
  const router = useRouter();

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showIncorrectUsername, setShowIncorrectUsername] = useState(false);
  const [showIncorrectPassword, setShowIncorrectPassword] = useState(false);

  const [showingLogin, setShowingLogin] = useState(true)

  const [profileRequests, setProfileRequests] = useState(profiles)

  const handleLogin = () => {
    for(let i = 0; i < profiles.length; i++){
      //console.log(profiles[i].username)
      if(username == profiles[i].username){
        // Check password
        if(password == profiles[i].password){
          setShowIncorrectUsername(false)
          setShowIncorrectPassword(false)
          router.replace({
              pathname: "/lock",
              params: {
                "username": username,
              }
          })
          return null;
        } else {
          setShowIncorrectUsername(false)
          setShowIncorrectPassword(true)
          console.log("Incorrect password");
          return null;
        }
      }
    }
    
    setShowIncorrectUsername(true)
    setShowIncorrectPassword(false)
    console.log("No username found!");
    return null; // Error found no similar username
    //setShowNotify(!showNotify)
  }


  const handleSignin = () => {
    console.log("credentials set here")

    setTimeout(async () => {
      const profile_request = await getData("profile_requests")
      if(profile_request != null){
        console.log("test")
      }

      await setData("profile_requests", [{
        'username': username,
        'password': password,
        'type': "user",
        'time': [],
      }])
    }, 3000)

    
    //router.replace("/lock");
  }

  return (
    <View style={ globalStyles.container }>
      <ScrollView>
        <View style={globalStyles.frontLogo}>
          <Image style={globalStyles.frontImage} source={require('../assets/images/padlock.png')}/>
          <Text style={globalStyles.title}>SmartLock</Text>
          <Text style={globalStyles.subtitle}>Controlling Lab Door No. 1</Text>
          <Text style={globalStyles.date}>11:00 AM, Tuesday, June 30</Text>
        </View>
        
        <View style={globalStyles.buttonContainer}>
          <Pressable onPress={() => {
            setShowingLogin(true); setShowIncorrectUsername(false); setShowIncorrectPassword(false);
          }} style={globalStyles.buttonOne}>
            <Text style={showingLogin ? globalStyles.buttonTextOne : globalStyles.buttonTextDisabledOne}>Login</Text>
          </Pressable>
          <BarSeparator />
          <Pressable onPress={() => {
            setShowingLogin(false); setShowIncorrectUsername(false); setShowIncorrectPassword(false);
          }} style={globalStyles.buttonOne}>
            <Text style={showingLogin ? globalStyles.buttonTextDisabledOne : globalStyles.buttonTextOne}>Sign In</Text>
          </Pressable>
        </View>

        <View>
        {showingLogin ?
          <View>
            <View>
              <Text style={globalStyles.inputFieldLabel}>Username:</Text>
              <TextInput 
                style={globalStyles.inputField}
                placeholder="Enter your Username"
                value={username}
                onChangeText={(text) => setUsername(text)}
              />
              <Text style={globalStyles.inputFieldLabel}>Password:</Text>
              <TextInput
                style={globalStyles.inputField}
                placeholder="Enter your Password"
                value={password}
                onChangeText={(text) => setPassword(text)}
              />
            </View>
            
            {showIncorrectUsername ?
            <View style={globalStyles.notifyContainer}>
              <Text style={globalStyles.notifyText}>Username not found!</Text>
            </View>: null
            }

            {showIncorrectPassword ?
            <View style={globalStyles.notifyContainer}>
              <Text style={globalStyles.notifyText}>Password not correct!</Text>
            </View>: null
            }
            
            <View style={globalStyles.buttonContainer}>
              <Pressable onPress={handleLogin} style={globalStyles.buttonPrimary}>
                <View style={globalStyles.buttonPrimaryContainer}>
                  <Image style={globalStyles.buttonImage} source={require('../assets/images/login.png')}/>
                  <Text style={globalStyles.buttonText}>Log in</Text>
                </View>
              </Pressable>
            </View>
          </View>:
          <View>
            <View>
              <Text style={globalStyles.inputFieldLabel}>Username:</Text>
              <TextInput 
                style={globalStyles.inputField}
                placeholder="Enter your Username"
                value={username}
                onChangeText={(text) => setUsername(text)}
              />
              <Text style={globalStyles.inputFieldLabel}>Password:</Text>
              <TextInput
                style={globalStyles.inputField}
                placeholder="Enter your Password"
                value={password}
                onChangeText={(text) => setPassword(text)}
              />
            </View>
            
            
            
            {showIncorrectUsername ?
            <View style={globalStyles.notifyContainer}>
              <Text style={globalStyles.notifyText}>Username already taken!</Text>
            </View>: null
            }

            <View style={globalStyles.buttonContainer}>
              <Pressable onPress={handleSignin} style={globalStyles.buttonSecondary}>
                <View style={globalStyles.buttonPrimaryContainer}>
                  <Image style={globalStyles.buttonImage} source={require('../assets/images/signup.png')}/>
                  <Text style={globalStyles.buttonText}>Sign-In Request</Text>
                </View>
              </Pressable>
            </View>
          </View>
        }
          

        </View>

      </ScrollView>
    </View>
  );
}

const BarSeparator = () => <View style={globalStyles.separator} />;


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
