import { FaWhiskeyGlass } from 'react-icons/fa6';
import { RiErrorWarningLine } from 'react-icons/ri';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { AiOutlineLogin, AiOutlineLoading3Quarters } from 'react-icons/ai';

export const ICONS = {
    arrowLeft: <FaArrowLeft className='icon arrow-left-icon' />,
    arrowRight: <FaArrowRight className='icon arrow-right-icon' />,
    eye: <IoEyeOutline className='icon eye-icon' />,
    eyeOff: <IoEyeOffOutline className='icon eyeOff-icon' />,
    loading: <AiOutlineLoading3Quarters className='icon loading-icon' />,
    login: <AiOutlineLogin className='icon login-icon' />,
    shot: <FaWhiskeyGlass className='icon shot-icon' />,
    warning: <RiErrorWarningLine className='icon warning-icon' />
}