import socket
import pyaudio

UDP_IP = "0.0.0.0"
UDP_PORT = 46000

# Audio format matches sender
CHANNELS = 2
RATE = 48000
FORMAT = pyaudio.paInt16
CHUNK_SIZE = 1024  # number of frames per packet to play

# Setup audio output
p = pyaudio.PyAudio()
stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                output=True,
                frames_per_buffer=CHUNK_SIZE)

# Setup UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))
print(f"Listening on UDP port {UDP_PORT}...")

try:
    while True:
        data, _ = sock.recvfrom(4096)  # larger than CHUNK_SIZE * bytes_per_frame
        if data:
            stream.write(data)
except KeyboardInterrupt:
    pass
finally:
    stream.stop_stream()
    stream.close()
    p.terminate()
    sock.close()
