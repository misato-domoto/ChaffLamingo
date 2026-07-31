'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SetPwdCard() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
  e.preventDefault();

  setPasswordError('');
  setConfirmPasswordError('');

  let hasError = false;

  if (!password) {
    setPasswordError('パスワードを入力してください');
    hasError = true;
  }

  if (!confirmPassword) {
    setConfirmPasswordError('確認用パスワードを入力してください');
    hasError = true;
  }

  const passwordRegex = /^[A-Za-z0-9]{4,}$/; // 4文字以上の半角英数字

  if (password && !passwordRegex.test(password)) {
    setPasswordError(
      'パスワードは4文字以上の半角英数字で設定してください'
    );
    hasError = true;
  }

  if (
    password &&
    confirmPassword &&
    password !== confirmPassword
  ) {
    setConfirmPasswordError(
      'パスワードが一致しません'
    );
    hasError = true;
  }

  if (hasError) {
    return;
  }

  router.push('/login');
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
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-64 bg-shuffle-tint text-shuffle rounded-sm px-4 py-1'
              placeholder='パスワードを設定してください'
            />
            <div className='h-6'>
              {passwordError && (
                <div className='text-xs text-left text-flamingo'>
                  {passwordError}
                </div>
              )}
            </div>
          </div>

          <div>
            <input
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className='w-64 bg-shuffle-tint text-shuffle rounded-sm px-4 py-1'
              placeholder='もう一度パスワードを入力してください'
            />
            <div className='h-6'>
              {confirmPasswordError && (
                <div className='text-xs text-left text-flamingo'>
                  {confirmPasswordError}
                </div>
              )}
            </div>
          </div>

          <button type='submit' className='mb-3 bg-shuffle text-white rounded-sm px-6 py-1'>
            設定
          </button>
        </form>
      </div>
    </div>
  );
}