'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SignUpCard() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
  e.preventDefault();

  setEmailError('');

  let hasError = false;

  if (!email) {
    setEmailError('メールアドレスを入力してください');
    hasError = true;
  }

  if (hasError) {
    return;
  }

  router.push('/set-pwd');
};

  return (
    <div className='fixed inset-0 flex items-center justify-center p-4 bg-shuffle-tint'>
      <div className='relative flex h-fit flex-col rounded-md bg-card p-8 shadow-md sm:px-28'>
        <div className='relative mx-auto mb-2 aspect-[2/1] w-60'>
          <Image src='/icons/logo-login.svg' alt='ChaffLamingo' fill priority className='object-container' />
        </div>
        <form className='text-center' onSubmit={handleLogin}>
          <div>
            <input
              type='text'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-64 bg-shuffle-tint text-shuffle rounded-sm px-4 py-1'
              placeholder='メールアドレス'
            />
            <div className='h-6'>
              {emailError && (
                <div className='text-xs text-left text-flamingo'>
                  {emailError}
                </div>
              )}
            </div>
          </div>

          <button type='submit' className='mb-3 bg-shuffle text-white rounded-sm px-6 py-1'>
            会員登録
          </button>
        </form>
        <div className='text-center text-xs mb-2'>
          <a href='/login'>ログインはこちら</a>
        </div>
      </div>
    </div>
  );
}