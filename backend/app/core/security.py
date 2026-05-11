import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from passlib.context import CryptContext
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")

# JWT / token settings (can be set via environment variables)
SECRET_KEY = os.getenv("SECRET_KEY", "change_this_secret_in_production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def hash_password(password: str) -> str:
	# bcrypt has a 72-byte input limit. Use bcrypt_sha256 which pre-hashes
	# long passwords safely. As a fallback, truncate to 72 bytes.
	try:
		return pwd_context.hash(password)
	except ValueError:
		# fallback: truncate to 72 bytes
		b = password.encode("utf-8")[:72]
		return pwd_context.hash(b)


def verify_password(plain_password: str, hashed_password: str) -> bool:
	try:
		return pwd_context.verify(plain_password, hashed_password)
	except ValueError:
		# if stored hash was created with raw bcrypt and password was truncated,
		# try verifying against truncated input
		b = plain_password.encode("utf-8")[:72]
		return pwd_context.verify(b, hashed_password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
	to_encode = data.copy()
	now = datetime.utcnow()
	if expires_delta:
		expire = now + expires_delta
	else:
		expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
	to_encode.update({"exp": expire, "iat": now})
	encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
	return encoded_jwt

