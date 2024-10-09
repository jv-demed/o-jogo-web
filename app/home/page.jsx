import { Box } from '@/components/boxes/Box';
import { Main } from '@/components/boxes/Main';
import { Menu } from '@/components/home/Menu';

export default function Home(){
    return (
        <Main>
            <Box>
                <Menu />
            </Box>
        </Main>
    );
}