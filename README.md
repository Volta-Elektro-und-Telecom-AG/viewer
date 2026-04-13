# viewer

## installation
```
sudo bash -c "$(curl -sL https://raw.githubusercontent.com/patrikaeberli/viewer/refs/heads/main/install.sh)"
```

## refresh webpage on client device
```
sudo systemctl restart signage-kiosk
```




# known issues
## chromium/chromium-browser
depending on your version you need to change "chromium-browser" to just "chromium" in /home/kiosk/.config/openbox/autostart.
```
sudo nano /home/kiosk/.config/openbox/autostart
```
