import { FaWhiskeyGlass } from 'react-icons/fa6';
import { RiErrorWarningLine } from 'react-icons/ri';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { AiOutlineLogin, AiOutlineLoading3Quarters } from 'react-icons/ai';

export const ICONS = {
    arrowLeft: <FaArrowLeft className='icon arrow-left-icon' />,
    arrowRight: <FaArrowRight className='icon arrow-right-icon' />,
    eye: IoEyeOutline,
    eyeOff: IoEyeOffOutline,
    spinLoader: AiOutlineLoading3Quarters,
    login: AiOutlineLogin,
    shot: <FaWhiskeyGlass className='icon shot-icon' />,
    warning: RiErrorWarningLine
}