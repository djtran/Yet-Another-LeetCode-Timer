# Yet Another LeetCode Timer

There are a few of these out there but none that I was really satisfied with. [LeetPlug](https://leetplug.azurewebsites.net/) seemed promising but the server taking data is no longer in service so as a record for viewing progress, it's not super useful.

I used [LeetCode Timer Tracker](https://chrome.google.com/webstore/detail/leetcode-time-tracker/obcihoolahbncgakepoceagnjnfgghhl?hl=en) for a while, but I wanted something that felt integrated into LeetCode like how LeetPlug functioned.

### Requirements
1. Integrated into the page
  - starts when you either click start or you first start typing.
  - visible, but not distracting
  - stops once you have a successful submission
2. Local Data Storage
  - LeetPlug probably had interesting potential for aggregated data views, but ultimately the owner had to maintain and pay for a web server and the setup & email verification process felt like unnecessary work for someone that just wants to quickly pick it up and run with it.
3. Exportable
  - Excel sheets could be fun. Until data viz is built into this, I'll use excel or google sheets easily.


### Other Notes
Chrome local storage will get you through ~26k problems before you hit any storage limit. Sync storage would be nice, but you'd hit ~40 problems with the current impl. If we spread out the data across all keys and use all the sync storage allowed for an extension, we could manage around 500-512 problems. 

Unfortunately we cannot use sync and local storage at the same time, so the dream of having smaller aggregate metric data synced everywhere is not something I'll support here.

One of the risks of the current implementation is moving to another page will kill your timer. It's going to be logged to the console before being reset, so you can manually maintain and patch that up if needed.