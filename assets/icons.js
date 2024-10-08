import { RiErrorWarningLine } from 'react-icons/ri';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { AiOutlineLogin, AiOutlineLoading3Quarters } from 'react-icons/ai';

export const ICONS = {
    eye: <IoEyeOutline className='icon eye-icon' />,
    eyeOff: <IoEyeOffOutline className='icon eyeOff-icon' />,
    loading: <AiOutlineLoading3Quarters className='icon loading-icon' />,
    login: <AiOutlineLogin className='icon login-icon' />,
    warning: <RiErrorWarningLine className='icon warning-icon' />
}