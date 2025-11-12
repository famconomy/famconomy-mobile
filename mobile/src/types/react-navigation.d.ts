declare module '@react-navigation/native-stack' {
  export type NativeStackScreenProps<ParamList extends Record<string, object | undefined>, RouteName extends keyof ParamList = keyof ParamList> = {
    navigation: any;
    route: { key: string; name: RouteName; params: ParamList[RouteName] };
  };
  export function createNativeStackNavigator<T = any>(): any;
}

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator<T = any>(): any;
}