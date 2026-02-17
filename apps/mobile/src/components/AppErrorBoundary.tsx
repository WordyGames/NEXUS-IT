import React, { Component, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: ''
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Error desconocido'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[MOBILE] Error fatal en render:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      errorMessage: ''
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>La app no pudo iniciar</Text>
          <Text style={styles.subtitle}>
            Ocurrio un error durante el arranque. Presiona reintentar.
          </Text>

          <ScrollView style={styles.errorBox}>
            <Text style={styles.errorText}>{this.state.errorMessage}</Text>
          </ScrollView>

          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#f9fafb',
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16
  },
  errorBox: {
    maxHeight: 220,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  errorText: {
    color: '#7f1d1d',
    fontSize: 12
  },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  }
});
