import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { spacing, lightTheme, darkTheme } from '../../theme';

type RecipeDetailsParams = { recipeId: number };

const RecipeDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute() as unknown as { params: RecipeDetailsParams };
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;
  const { recipeId } = route.params;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Button
          title="← Back"
          onPress={() => navigation.goBack()}
          variant="outline"
          size="small"
          isDark={isDark}
        />
      </View>

      <Card isDark={isDark} style={styles.card}>
        <Text variant="h2" isDark={isDark}>
          Recipe {recipeId}
        </Text>
        <Text variant="body" color="textSecondary" isDark={isDark} style={styles.text}>
          Recipe details coming soon
        </Text>
      </Card>

      <View style={styles.sections}>
        <Card isDark={isDark} style={styles.section}>
          <Text variant="h4" isDark={isDark}>
            Ingredients
          </Text>
        </Card>

        <Card isDark={isDark} style={styles.section}>
          <Text variant="h4" isDark={isDark}>
            Instructions
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
  },
  header: {
    marginBottom: spacing[4],
  },
  card: {
    marginBottom: spacing[4],
  },
  text: {
    marginTop: spacing[2],
  },
  sections: {
    gap: spacing[3],
  },
  section: {
    marginBottom: spacing[2],
  },
});

export default RecipeDetailsScreen;
