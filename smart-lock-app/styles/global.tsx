import { StyleSheet } from 'react-native';

export const colors = {
  background: '#1a1a2e',
  header: '#242444',
  surface: '#2a2a4a',
  primary: '#4fc3f7',
  secondary: '#32CD32',
  text: '#ffffff',
  textSecondary: '#a0a0b0',
  alert: '#ff5252',
};

export const globalStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
  },
  intertitle: {
    fontSize: 24,
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitleCentered: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    display: 'flex',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 30,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonNavbarText: {
    fontSize: 16,
    color: colors.text,
    padding: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonOne: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  buttonTextOne: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    alignItems: 'center',
  },
  buttonTextDisabledOne: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
    alignItems: 'center',
  },
  buttonPrimary: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buttonPrimaryContainer: {
    display: 'flex',
    flexDirection: 'row',
    padding: 10,
    gap: 16,
  },
  buttonSecondary: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: colors.secondary,
    alignItems: 'center',
  },
  buttonTertiary: {
    borderRadius: 10,
    backgroundColor: colors.alert
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  buttonImage: {
    width: 32,
    height: 32,
  },
  buttonIconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    padding: 10,
  },
  buttonIconText: {
    fontSize: 24,
    color: colors.text,
    marginLeft: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonIconSmallText: {
    fontSize: 20,
    color: colors.text,
    paddingLeft: 20,
    paddingRight: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#a0a0b0',
    marginTop: 4,
    marginBottom: 30,
  },
  inputFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  inputField: {
    height: 40, 
    borderWidth: 1, 
    borderColor: '#ccc',
    color: colors.text,
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  notifyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  notifyContainer: {
    borderRadius: 10,
    backgroundColor: colors.alert,
    marginBottom: 10,
    padding: 5,
    paddingLeft: 10,
  },
  frontImage: {
    width: 200,
    height: 200,
  },
  frontLogo: {
    paddingTop: 70,
    display: 'flex',
    alignItems: 'center',
  },
  recentLogin: {
    marginBottom: 100,
  },
  nameTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  timeTitle: {
    fontSize: 20,
    fontWeight: 'heavy',
    color: colors.text,
  },
  centerContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  lockContainer: {
    paddingTop: 70,
    paddingBottom: 50,
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
  },
  lockSubContainer: {
    paddingTop: 24,
    paddingBottom: 24,
    flex: 1,
  },
  debugExpander: {
    marginBottom: 5000,
  },
  leftSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 16,
  },
  headerContainer: {
    display: "flex",
    flexDirection: "row",
    flex: 1,
    paddingBottom: 10,
  },
  rightAlign: {
    marginLeft: "auto",
  },
  expander: {
    marginBottom: 150,
  },
  timecardContainer: {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
  },
  userImage: {
    width: 80,
    height: 80,
  },
  userCardContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  userCardSubcontainer: {
    marginLeft: 10,
  },
  separator: {
    height: '100%',
    width: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 5,
  },
});