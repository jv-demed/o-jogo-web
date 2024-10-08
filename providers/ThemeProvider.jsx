'use client'

import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { darkTheme } from '@/assets/themes';

export function ThemeProvider({ children }){
    return (
        <StyledThemeProvider theme={darkTheme}>
            {children}
        </StyledThemeProvider>
    );
}