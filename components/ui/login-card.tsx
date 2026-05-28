'use client';

import { LogIn } from 'lucide-react';
import Image from 'next/image';

export default function LoginCard() {
  return (
    <div className='fixed inset-0 flex items-center justify-center p-4 bg-[#C4E4F4]'>
      <div className='relative flex h-fit flex-col rounded-md bg-card p-8 shadow-md sm:px-28'>
        <div className='relative mx-auto mb-2 aspect-[2/1] w-60'>
            <Image src='/icons/logo-login.svg' alt='ChaffLamingo' fill priority className='object-container' />
        </div>
        <form className='text-center'>
            <div className='mb-4'>
                <input type='text' className='w-64 bg-[#C4E4F4] text-[#4CABD8] rounded-sm px-4 py-1' placeholder='メールアドレス'/>
            </div>
            <div className='mb-4'>
                <input type='password' className='w-64 bg-[#C4E4F4] text-[#4CABD8] rounded-sm px-4 py-1' placeholder='パスワード'/>
            </div>
            <button className='mb-3 bg-[#4CABD8] text-white rounded-sm px-6 py-1'>ログイン</button>
        </form>
        <div className='text-center text-xs mb-2'>
          <a href='#'>新規会員登録はこちら</a>
        </div>
        <div className='text-center text-xs'>
          <a href='#'>パスワードを忘れた方はこちら</a>
        </div>
      </div>
    </div>
  );
}
